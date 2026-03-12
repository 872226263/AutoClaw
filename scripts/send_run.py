#!/usr/bin/env python3
import argparse
import json
import urllib.parse
import urllib.request


def main():
    parser = argparse.ArgumentParser(description='Send AutoClaw run command safely.')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=9317)
    parser.add_argument('--name', default='remote.js')
    parser.add_argument('--code', help='Inline JS code')
    parser.add_argument('--file', help='Path to JS file')
    args = parser.parse_args()

    if not args.code and not args.file:
        raise SystemExit('Provide --code or --file')

    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            script = f.read()
    else:
        script = args.code

    query = urllib.parse.urlencode({
        'cmd': 'run',
        'path': args.name,
        'script': script,
    })
    url = f'http://{args.host}:{args.port}/exec?{query}'
    with urllib.request.urlopen(url, timeout=10) as resp:
        print(resp.read().decode())


if __name__ == '__main__':
    main()
