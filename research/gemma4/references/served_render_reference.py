# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Dmitry Gluzdov
# Historical vLLM 0.19.1 / ADK 0.2.11 reference, not a current-scorer patch.
# Recheck token IDs after changing wheels; see README.md.
"""Render chat requests exactly as the installed vLLM 0.19.1 serves them.

Evidence (served_prompt_checks.csv): vLLM's
chat_utils._parse_chat_message_content keeps only message['reasoning'] (ADK/LiteLLM
replays history as 'reasoning_content', which is dropped) and wraps string content
as [{type:text}] under the auto content format. With these two rules the rendered
prompt length equals usage.prompt_tokens on 803/803 native and 133/133 held-out
turns. Completions: the model emits THOUGHT + '<channel|>' (no newline), the
template-canonical tool call, then the '<|tool_response>' stop token; a final
answer ends with '<turn|>'. Nothing here truncates or invents content.
"""
import copy
import json

FORCED = '<|channel>thought\n'


def normalize(messages):
    result = copy.deepcopy(messages)
    for message in result:
        for call in message.get('tool_calls', []) or []:
            arguments = call['function'].get('arguments')
            if isinstance(arguments, str):
                arguments = json.loads(arguments)
                if not isinstance(arguments, dict):
                    raise ValueError('Tool arguments must be a JSON object')
                call['function']['arguments'] = arguments
    return result


def served_history(messages):
    out = []
    for message in normalize(messages):
        message = dict(message)
        if message['role'] == 'assistant':
            # Mirrors vllm/entrypoints/chat_utils.py: only 'reasoning' survives.
            message.pop('reasoning_content', None)
        content = message.get('content')
        if isinstance(content, str):
            message['content'] = [{'type': 'text', 'text': content}]
        out.append(message)
    return out


def template_kwargs(request):
    kwargs = dict(request.get('chat_template_kwargs') or {})
    kwargs.setdefault('enable_thinking', True)
    return kwargs


def render_prefix(tokenizer, request):
    return tokenizer.apply_chat_template(served_history(request['messages']), tools=request.get('tools') or None,
                                         add_generation_prompt=True, tokenize=False, **template_kwargs(request))


def reconstruct(tokenizer, request, response):
    """Return {'prefix','thought','action'} texts or None when not reconstructable."""
    history = served_history(request['messages'])
    kwargs = template_kwargs(request)
    tools = request.get('tools') or None
    prefix = tokenizer.apply_chat_template(history, tools=tools, add_generation_prompt=True, tokenize=False, **kwargs)
    thought = response.get('reasoning') or response.get('reasoning_content') or ''
    target = normalize([dict(response, role='assistant')])[0]
    target.pop('reasoning', None)
    target.pop('reasoning_content', None)
    full = tokenizer.apply_chat_template(history + [target], tools=tools, add_generation_prompt=False,
                                         tokenize=False, **kwargs)
    if prefix.endswith(FORCED):
        base = prefix[:-len(FORCED)]
        thought_part = thought + '<channel|>'
    else:
        base = prefix
        thought_part = FORCED + thought + '<channel|>'
    if not full.startswith(base):
        return None
    action = full[len(base):]
    if action.endswith('<turn|>\n'):
        action = action[:-1]
    return {'prefix': prefix, 'thought': thought_part, 'action': action}


def encode_example(tokenizer, request, response):
    """Token ids for prompt/thought/action; joint encoding must equal the concatenation."""
    parts = reconstruct(tokenizer, request, response)
    if parts is None:
        return None
    encode = lambda text: tokenizer.encode(text, add_special_tokens=False)
    prefix_ids = encode(parts['prefix'])
    thought_ids = encode(parts['thought'])
    action_ids = encode(parts['action'])
    joint = encode(parts['thought'] + parts['action'])
    return {'prefix_ids': prefix_ids, 'thought_ids': thought_ids, 'action_ids': action_ids,
            'joint_consistent': joint == thought_ids + action_ids, 'texts': parts}
