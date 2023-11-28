import tap from 'tap';
import Response from '../lib/response.js';

tap.test('Response() - object tag - should be PodiumClientResponse', t => {
    const response = new Response();
    t.equal(
        Object.prototype.toString.call(response),
        '[object PodiumClientResponse]',
    );
    t.end();
});

tap.test('Response() - no arguments - should set "content" to empty Sting', t => {
    const response = new Response();
    t.equal(response.content, '');
    t.end();
});

tap.test('Response() - no arguments - should set "content" to empty Sting', t => {
    const response = new Response();
    t.equal(response.content, '');
    t.end();
});

tap.test('Response() - no arguments - should set "headers" to empty Object', t => {
    const response = new Response();
    t.same(response.headers, {});
    t.end();
});

tap.test('Response() - no arguments - should set "css" to empty Array', t => {
    const response = new Response();
    t.same(response.css, []);
    t.end();
});

tap.test('Response() - no arguments - should set "js" to empty Array', t => {
    const response = new Response();
    t.same(response.js, []);
    t.end();
});

tap.test('Response() - no arguments - should return default values when calling toJSON()', t => {
    const response = new Response();
    t.same(response.toJSON(), {
        content: '',
        headers: {},
        css: [],
        js: [],
        redirect: null,
    });
    t.end();
});

tap.test('Response() - no arguments - should return default content value when calling toString()', t => {
    const response = new Response();
    t.same(response.toString(), '');
    t.end();
});

tap.test('Response() - "content" argument has a value - should set value on "content"', t => {
    const response = new Response({ content: 'foo' });
    t.equal(response.content, 'foo');
    t.end();
});

tap.test('Response() - "headers" argument has a value - should set value on "headers"', t => {
    const response = new Response({ headers: { foo: 'bar' } });
    t.same(response.headers, { foo: 'bar' });
    t.end();
});

tap.test('Response() - "css" argument has a value - should set value on "css"', t => {
    const response = new Response({ css: ['foo'] });
    t.same(response.css, ['foo']);
    t.end();
});

tap.test('Response() - "js" argument has a value - should set value on "js"', t => {
    const response = new Response({ js: ['foo'] });
    t.same(response.js, ['foo']);
    t.end();
});

tap.test('Response() - arguments is set - should return set values when calling toJSON()', t => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
        redirect: { statusCode: 302, location: 'http://redirects.are.us.com' },
    });
    t.same(response.toJSON(), {
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
        redirect: { statusCode: 302, location: 'http://redirects.are.us.com' },
    });
    t.end();
});

tap.test('Response() - arguments is set - should return set content value when calling toString()', t => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    t.equal(response.toString(), 'foo');
    t.end();
});

tap.test('Response() - use Object in String literal - should use value of set content', t => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    t.equal(`bar ${response}`, 'bar foo');
    t.end();
});

tap.test('Response() - concatinate Object with other String - should use value of set content', t => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
    });
    t.equal(`bar ${response}`, 'bar foo');
    t.end();
});

tap.test('Response() - JSON.stringify object - should return JSON string object', t => {
    const response = new Response({
        content: 'foo',
        headers: { foo: 'bar' },
        css: ['foo'],
        js: ['foo'],
        redirect: null,
    });
    t.equal(
        JSON.stringify(response),
        '{"redirect":null,"content":"foo","headers":{"foo":"bar"},"css":["foo"],"js":["foo"]}',
    );
    t.end();
});
