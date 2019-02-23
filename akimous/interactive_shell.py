from threading import Thread, Event
from functools import partial

from jupyter_client import KernelManager

from .websocket import register_handler
from .utils import nop
from logzero import logger

handles = partial(register_handler, 'jupyter')


def iopub_listener(context):
    client = context.jupyter_client
    send = context.main_thread_send
    kernel_stopped = context.kernel_stopped
    while True:
        message = client.get_iopub_msg()
        if kernel_stopped.is_set():
            logger.info('IOPub listener terminated')
            return
        logger.debug(message['content'])
        send('IOPub', message['content'])


@handles('_connected')
async def connected(client_id, send, context):
    context.kernel_manager = KernelManager()
    context.iopub_listener_thread = Thread()


@handles('_disconnected')
async def disconnected(context):
    await stop_kernel({}, nop, context)


@handles('StartKernel')
async def start_kernel(msg, send, context):
    await stop_kernel(msg, send, context)
    context.kernel_manager.start_kernel()
    context.jupyter_client = context.kernel_manager.client()
    context.kernel_stopped = Event()
    context.iopub_listener_thread = Thread(target=iopub_listener, args=(context, ))
    context.iopub_listener_thread.start()
    await send('KernelStarted', None)


@handles('StopKernel')
async def stop_kernel(msg, send, context):
    if not context.kernel_manager.is_alive():
        return
    context.kernel_stopped.set()
    context.kernel_manager.shutdown_kernel()
    await send('KernelStopped', None)


@handles('Run')
async def run(msg, send, context):
    logger.debug('Running code %s', msg['code'])
    context.jupyter_client.execute(msg['code'])
