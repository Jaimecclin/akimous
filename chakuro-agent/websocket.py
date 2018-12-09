import asyncio
import traceback
import webbrowser
from collections import defaultdict
from contextlib import suppress
from multiprocessing import Process
from types import SimpleNamespace

import msgpack
import websockets
from logzero import logger as log

from static_server import serve_http
from word_completer import initialize as initialize_word_completer


handlers = defaultdict(dict)  # [path][event] -> coroutine
clients = defaultdict(lambda: defaultdict(set))  # [client_id][path] -> set of websockets
shared_contexts = {}  # [client_id] -> SimpleNamespace
max_client_id = 0


def register_handler(path, command):
    path = f'/{path}'
    assert command not in handlers[path]

    def decorator(coroutine):
        handlers[path][command] = coroutine
        return coroutine

    return decorator


async def socket_handler(ws: websockets.WebSocketServerProtocol, path: str):
    global max_client_id

    def main_thread_send(event, obj):
        context.event_loop.call_soon_threadsafe(asyncio.ensure_future, send(event, obj))

    context = SimpleNamespace(
        linter_task=None,
        observer=None,
        observed_watches={},
        event_loop=asyncio.get_event_loop(),
        main_thread_send=main_thread_send)

    async def send(event, obj):
        # log.warn('sending event %s: %s', event, repr(obj))
        await ws.send(msgpack.packb([event, obj]))

    try:
        path_handler = handlers.get(path, None)
        if path_handler is None:
            log.error('No handlers associated with path %s', path)
            ws.close()
            return

        # first message: announce client id (for master) or receive client id
        if path == '/':
            max_client_id += 1
            client_id = max_client_id
            connected_handler = path_handler.get('_connected', None)
            context.shared_context = SimpleNamespace()
            shared_contexts[client_id] = context.shared_context
            print('???', shared_contexts)
            await connected_handler(client_id, send, context)
        else:
            msg = msgpack.unpackb(await ws.recv(), raw=False)
            client_id = msg.get('clientId', None)
            context.shared_context = shared_contexts[client_id]
            if not client_id:
                log.error('Do not receive client id. Closing connection')
                ws.close()
                return

        clients[client_id][path].add(ws)
        context.client_id = client_id
        log.info('Connection %s established.', path)

        while 1:
            msg = await ws.recv()
            msg = msgpack.unpackb(msg, raw=False)
            event, obj = msg
            # log.debug('Received message from %s/%s: %s', path, event, obj)
            event_handler = path_handler.get(event, None)
            if not event_handler:
                log.warn('Unhandled command %s/%s.', path, event)
                continue
            try:
                await event_handler(obj, send, context)
            except Exception:
                traceback.print_exc()

    except websockets.exceptions.ConnectionClosed:
        log.info('Connection %s closed.', path)
        clients[client_id][path].remove(ws)
        if context.linter_task:
            context.linter_task.cancel()
        if context.observer:
            with suppress(Exception):
                context.observer.stop()


def start_server(host, port, ws_port, no_browser):
    # serve static content
    process = Process(target=serve_http, name='http_process', kwargs={'host': host, 'port': port})
    process.start()

    # serve websocket
    loop = asyncio.get_event_loop()
    loop.set_debug(True)
    loop.slow_callback_duration = 0.1
    websocket_server = websockets.serve(socket_handler, host=host, port=ws_port)
    loop.run_until_complete(websocket_server)
    initialize_word_completer(loop)
    log.info('Starting websocket server, listening on %s:%d', host, ws_port)

    if not no_browser and not webbrowser.open(f'http://{host}:{port}'):
        log.warn(f'No browsers available. Please open http://{host}:{port} manually.')

    try:
        loop.run_forever()
        process.join()
    except KeyboardInterrupt:
        for paths in clients.values():
            for path in paths.values():
                for socket in path:
                    socket.close()
        loop.stop()
        exit(0)
