'use strict';

const Response = require('../lib/response');

test('Response() - object tag - should be PodiumClientResponse', () => {
    const response = new Response();
    expect(Object.prototype.toString.call(response)).toEqual(
        '[object PodiumClientResponse]',
    );
});

test('Response() - no arguments - should set "content" to empty Sting', () => {
    const response = new Response();
    expect(response.content).toBe('');
});

test('Response() - no arguments - should set "content" to empty Sting', () => {
    const response = new Response();
    expect(response.content).toBe('');
});

test('Response() - no arguments - should set "headers" to empty Object', () => {
    const response = new Response();
    expect(response.headers).toEqual({});
});

test('Response() - no arguments - should set "css" to empty Array', () => {
    const response = new Response();
    expect(response.css).toEqual([]);
});

test('Response() - no arguments - should set "js" to empty Array', () => {
    const response = new Response();
    expect(response.js).toEqual([]);
});

test('Response() - no arguments - should return default values when calling toJSON()', () => {
    const response = new Response();
    expect(response.toJSON()).toEqual({
        content: '',
        headers: {},
        css: [],
        js: [],
    });
});

test('Response() - no arguments - should return default content value when calling toString()', () => {
    const response = new Response();
    expect(response.toString()).toEqual('');
});

test('Response() - "content" argument has a value - should set value on "content"', () => {
    const response = new Response({ content: 'foo' });
    expect(response.content).toBe('foo');
});

test('Response() - "headers" argument has a value - should set value on "headers"', () => {
    const response = new Response({ headers: { foo: 'bar' } });
    expect(response.headers).toEqual({ foo: 'bar' });
});

test('Response() - "css" argument has a value - should set value on "css"', () => {
    const response = new Response({ css: ['foo'] });
    expect(response.css).toEqual(['foo']);
});

test('Response() - "js" argument has a value - should set value on "js"', () => {
    const response = new Response({ js: ['foo'] });
    expect(response.js).toEqual(['foo']);
});

test('Response() - arguments is set - should return set values when calling toJSON()', () => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    expect(response.toJSON()).toEqual({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
});

test('Response() - arguments is set - should return set content value when calling toString()', () => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    expect(response.toString()).toEqual('foo');
});

test('Response() - use Object in String literal - should use value of set content', () => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    expect(`bar ${response}`).toEqual('bar foo');
});

test('Response() - concatinate Object with other String - should use value of set content', () => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    expect(`bar ${  response}`).toEqual('bar foo');
});

test('Response() - JSON.stringify object - should return JSON string object', () => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    expect(JSON.stringify(response)).toEqual('{"content":"foo","headers":{"foo":"bar"},"css":["foo"],"js":["foo"]}');
});