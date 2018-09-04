import pickle
import numpy as np
import pandas as pd
import tokenize
from colorama import init
from colorama import Fore as F
from colorama import Back as B
from sklearn.externals import joblib
import sys
init()


show_error = False if len(sys.argv) < 2 else bool(sys.argv[1])

fe = pickle.load(open('/Users/ray/Code/Working/single.pkl', 'rb'))
model = joblib.load('/Users/ray/Code/Working/single.model')
df = fe.dataframe()

file_path = '/Users/ray/Code/Working/keras/keras/optimizers.py'
with open(file_path) as f:
    doc = f.read().splitlines()
with open(file_path, 'rb') as f:
    tokens = list(tokenize.tokenize(f.readline))
train_test_boundary = fe.index[len(fe.index) // 2]

token_i = 0
doc_pos = (0, 0)
df_i = 0
length = len(tokens)
token_selection_start = 0
index_i = 0

completions = list(df.c)
predicted_prob = model.predict_proba(fe.X)[:, 1]

correct_prediction = 0
wrong_prediction = 0
not_available = 0
not_required = 0


def get_range_from_doc(start, end):
    result = []
    ch = start[1]
    for line in range(max(start[0] - 1, 0), end[0]):
        end_ch = None if line != end[0] - 1 else end[1]
        result.append(doc[line][ch:end_ch])
        ch = 0
    return '\n'.join(result)


def predict_and_color(token):
    global index_i, token_selection_start, correct_prediction, wrong_prediction, not_available, not_required
    token_selection_end = fe.index[index_i]
    t = fe.tokens[token_selection_start]

    while t.start < token.start:
        index_i += 1
        token_selection_start = token_selection_end
        token_selection_end = fe.index[index_i]
        t = fe.tokens[token_selection_start]

    selections = completions[token_selection_start:token_selection_end]
    if not selections:
        return F.RED + token.string
    yp = predicted_prob[token_selection_start:token_selection_end]
    # print(f'\nPROBA:{yp} SELECTIONS:{selections}')
    yi = yp.argmax()

    if len(token.string) == 1:
        not_required += 1
        return B.RESET + F.CYAN + token.string
    elif selections[yi] == token.string:
        correct_prediction += 1
        return B.RESET + F.GREEN + token.string
    elif token.string not in selections:
        not_available += 1
        return B.RESET + F.BLUE + token.string
    elif show_error:
        wrong_prediction += 1
        return B.RESET + F.RED + token.string + B.RED + F.WHITE + selections[yi]
    else:
        wrong_prediction += 1
        return B.RESET + F.RED + token.string


while token_i < length:
    token = tokens[token_i]

    if token.start == token.end:
        pass
    elif token.string == '\n':
        pass
    elif token.string.startswith(get_range_from_doc(token.start, token.end)):
        if doc_pos < token.start:
            print(B.RESET + F.MAGENTA + get_range_from_doc(doc_pos, token.start), end='')
        if token.type in (2, 3, 4, 53, 57, 58):  # (NUMBER, STRING, NEWLINE, OP, COMMENT, NL)
            print(B.RESET + F.RESET + token.string, end='')
        else:
            print(predict_and_color(token), end='')
        doc_pos = token.end

    else:
        print(B.RED + token.string, end='')
    token_i += 1
    # if token_i > 200:
    #     break
print()
print('CORRECT PREDICTION:', correct_prediction)
print('WRONG PREDICTION  :', wrong_prediction)
print('NOT AVAILABLE     :', not_available)
print(f'ACCURACY          : {(correct_prediction / (correct_prediction+wrong_prediction)):.2%}')
print(f'SUCCESSFUL RATE   : {(correct_prediction / (correct_prediction+wrong_prediction+not_available)):.2%}')