from .feature_definition import FeatureDefinition, MAX, MAX_SCAN_LINES
import re


COMPLETION_TYPES = [
    'class',
    'function',
    'instance',
    'keyword',
    'module',
    'param',
    'statement'
]
for t in COMPLETION_TYPES:
    @FeatureDefinition.register_feature_generator(t)
    def f(completion, t=t, **_):
        return 1 if completion.type == t else 0


# TODO: type bi-gram, (name, type) and (type, name) bi-gram tuples
COMPLETION_DATA_TYPES = [
    'str', 'int', 'float', 'bool', 'bytes',
    'list', 'dict', 'tuple'
]
for t in COMPLETION_DATA_TYPES:
    @FeatureDefinition.register_feature_generator(t)
    def f(completion_data_type, t=t, **_):
        return int(completion_data_type == t)


@FeatureDefinition.register_feature_generator('is_upper_case')
def f(completion, **_):
    return int(completion.name.isupper())


@FeatureDefinition.register_feature_generator('is_lower_case')
def f(completion, **_):
    return int(completion.name.islower())


@FeatureDefinition.register_feature_generator('is_initial_upper_case')
def f(completion, **_):
    return int(completion.name[0].isupper())


CONTAINS_STRING = ['_']
for s in CONTAINS_STRING:
    @FeatureDefinition.register_feature_generator(f'contains_{s}')
    def f(completion, s=s, **_):
        return 1 if s in completion.name else 0

REGEX = {
    'is': re.compile(r'^(is|are|IS|ARE).*'),
    'has': re.compile(r'^(has|have|HAS|HAVE).*'),
    'error': re.compile(r'.*Error$'),
    'starts_with__': re.compile(r'^_.*'),
    'starts_with___': re.compile(r'^__.*'),
}
for name, regex in REGEX.items():
    @FeatureDefinition.register_feature_generator(f'regex_{name}')
    def f(completion, regex=regex, **_):
        return 1 if regex.fullmatch(completion.name) else 0

# from keyword.kwlist, total 33
KEYWORDS = (
    'False',
    'None',
    'True',
    'and',
    'as',
    'assert',
    'break',
    'class',
    'continue',
    'def',
    'del',
    'elif',
    'else',
    'except',
    'finally',
    'for',
    'from',
    'global',
    'if',
    'import',
    'in',
    'is',
    'lambda',
    'nonlocal',
    'not',
    'or',
    'pass',
    'raise',
    'return',
    'try',
    'while',
    'with',
    'yield',

    'abs',
    'hash',
    'set',
    'all',
    'dict',
    'min',
    'setattr',
    'any',
    'next',
    'sorted',
    'enumerate',
    'bool',
    'int',
    'open',
    'str',
    'isinstance',
    'sum',
    'filter',
    'super',
    'iter',
    'print',
    'tuple',
    'len',
    'type',
    'list',
    'range',
    'getattr',
    'zip',
    'map',
    'reversed',
    'hasattr',
    'max',
    'round'
)
for keyword in KEYWORDS:
    @FeatureDefinition.register_feature_generator(f'kw_{keyword}')
    def f(completion, keyword=keyword, **_):
        return int(completion.name == keyword)


@FeatureDefinition.register_feature_generator('is_keyword')
def f(completion, **_):
    return int(completion.is_keyword)


@FeatureDefinition.register_feature_generator('in_builtin_module')
def f(completion, **_):
    return int(completion.in_builtin_module())


@FeatureDefinition.register_feature_generator('contains_in_nth_line')
def f(completion, doc, line, **_):
    completion = completion.name
    for l in range(0, min(line, MAX_SCAN_LINES)):
        if completion in doc[line - l]:
            return l
    return MAX


@FeatureDefinition.register_feature_generator('contains_in_nth_line_lower')
def f(completion, line, context, **_):
    completion = completion.name.lower()
    doc = context.doc_lines_to_lower_case
    for l in range(0, min(line, MAX_SCAN_LINES)):
        if completion in doc[line - l]:
            return l
    return MAX


@FeatureDefinition.register_feature_generator('t1_match')
def f(context, line, completion, **_):
    bigram = (context.t1, completion.name)
    matched_line_numbers = context.t1map.query(bigram)
    if not matched_line_numbers:
        return MAX
    result = min(abs(l - line) for l in matched_line_numbers)
    return result


@FeatureDefinition.register_feature_generator('t2_match')
def f(context, line, completion, **_):
    if not context.t2:
        return MAX
    bigram = (context.t2, completion.name)
    matched_line_numbers = context.t2map.query(bigram)
    if not matched_line_numbers:
        return MAX
    result = min(abs(l - line) for l in matched_line_numbers)
    return result


@FeatureDefinition.register_feature_generator('t3_match')
def f(context, line, completion, **_):
    if not context.t3:
        return MAX
    bigram = (context.t3, completion.name)
    matched_line_numbers = context.t3map.query(bigram)
    if not matched_line_numbers:
        return MAX
    result = min(abs(l - line) for l in matched_line_numbers)
    return result


@FeatureDefinition.register_feature_generator('trigram_match')
def f(context, line, completion, **_):
    if not context.t2:
        return MAX
    trigram = (context.t2, context.t1, completion.name)
    matched_line_numbers = context.trigram_map.query(trigram)
    if not matched_line_numbers:
        return MAX
    result = min(abs(l - line) for l in matched_line_numbers)
    return result
