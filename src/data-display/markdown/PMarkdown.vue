<template>
    <!-- eslint-disable -->
    <div class="p-markdown" v-html="md" />
</template>

<script lang="ts">
import {
    computed,
} from '@vue/composition-api';
import { render } from 'ejs';
import { get } from 'lodash';
import DOMPurify from 'dompurify';
import { MarkdownProps } from '@/data-display/markdown/type';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const marked = require('marked');

marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    highlight(code, language) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
        const hljs = require('highlight.js');
        const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
        const result = hljs.highlight(validLanguage, code);
        return result.value;
    },
});
const DEFAULT_LANGUAGE = 'en';

export default {
    name: 'PMarkdown',
    props: {
        markdown: {
            type: [String, Object],
            default: '',
        },
        data: {
            type: Object,
            default: undefined,
        },
        language: {
            type: String,
            default: 'en',
        },
    },
    setup(props: MarkdownProps) {
        const getI18nMd = (md: any) => get(md, props.language, md[DEFAULT_LANGUAGE] || Object.values(md)[0] || '');
        const md = computed(() => {
            let doc = typeof props.markdown === 'object' ? getI18nMd(props.markdown) : props.markdown || '';
            if (props.data) {
                doc = render(doc, props.data);
            }
            doc = marked(doc).replace(/<pre>/g, '<pre class="hljs"');
            return DOMPurify.sanitize(doc);
        });
        return {
            md,
        };
    },
};
</script>

<style lang="postcss">
@import 'highlight.js/scss/atom-one-dark.scss';
.p-markdown {
    @apply w-full border-black text-gray-900;
    padding-top: 1.5rem;
    padding-bottom: 1rem;
    padding-left: 1rem;
    table {
        td,th {
            @apply px-4 py-2;
        }
        thead {
            tr {
                th, td {
                    @apply border-black border-t border-b font-bold;
                }
            }
        }
        tbody {
            tr {
                td,th {
                    @apply border-gray-300 border-b;
                }
            }
        }
    }
    a {
        @apply text-blue-600;
        font-size: 0.75rem;
        line-height: 150%;
        margin-bottom: 1.5rem;
        &:hover { @apply underline; }
    }
    code {
        @apply bg-gray-200 rounded-xs px-1;
        font-family: courier, monospace;
    }
    pre {
        code {
            all: inherit;
        }
    }
    ul {
        @apply list-disc block;
        margin-block-start: 0.5rem;
        margin-block-end: 0.5rem;
        margin-inline-start: 0;
        margin-inline-end: 0;
        padding-inline-start: 2rem;

        ul {
            list-style: circle;
        }
    }
    ol {
        @apply block list-decimal ;
        margin-block-start: 0.5rem;
        margin-block-end: 0.5rem;
        margin-inline-start: 0;
        margin-inline-end: 0;
        padding-inline-start: 2rem;
    }
    h3, h4 {
        @apply font-bold;
    }
    h1 {
        @apply font-normal;
        font-size: 1.5rem;
        line-height: 150%;
        margin-bottom: 1.5rem;
    }
    h2 {
        @apply font-bold;
        font-size: 1rem;
        margin-bottom: 0.5rem;
        line-height: 150%;
    }
    h3 {
        @apply mb-2 mt-8;
        font-size: 0.875rem;
        line-height: 150%;
    }
    h4, h5, h6 {
        @apply mb-2 mt-5;
        font-size: 0.75rem;
        line-height: 150%;
    }
    p, ul > li, ol > li {
        font-size: 0.75rem;
        line-height: 150%;
        margin-bottom: 1.5rem;
    }
}

</style>
