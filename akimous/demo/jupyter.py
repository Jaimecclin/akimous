import time

from matplotlib import pyplot as plt
from sympy import *

plt.style.use('dark_background')
#%matplotlib inline
'yoyoyo'
print('pppp')

plt.plot([1, 2], [3, 4])

time.sleep(3)

init_printing(use_latex=True)
a, b, c, x = symbols('a b c x')
solve(a * x**2 + b * x + c, x)
