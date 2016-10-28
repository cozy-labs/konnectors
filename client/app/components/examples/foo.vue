<template lang="pug">
    div
        | Foo
        // - Test translation through vue-polyglot filter, wiht vars & counters
        p {{ 'file error' | t }}
        p {{ 'notification prefix' | t({name: 'foobar'}) }}
        p {{ 'notification commits' | t({smart_count: 8}) }}
</template>
