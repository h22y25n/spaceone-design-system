<template>
    <div class="p-dynamic-layout-html">
        <p-panel-top v-if="layoutName">
            {{ layoutName }}
        </p-panel-top>
        <div class="inner">
            <iframe ref="iframeRef" :title="name"
                    scrolling="no"
                    :srcdoc="iframeData"
                    @load="onLoadIFrame"
            />
        </div>
    </div>
</template>

<script lang="ts">
import {
    ComponentRenderProxy,
    computed, getCurrentInstance, reactive, toRefs,
} from '@vue/composition-api';
import { get } from 'lodash';
import { HtmlDynamicLayoutProps } from '@/data-display/dynamic/dynamic-layout/templates/html/type';
import PPanelTop from '@/data-display/titles/panel-top/PPanelTop.vue';
import DOMPurify from 'dompurify';
import { iframeStyle } from './style';


DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // set all elements owning target to target=_blank
    if ('target' in node) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener');
    }
});
export default {
    name: 'PDynamicLayoutHtml',
    components: { PPanelTop },
    props: {
        name: {
            type: String,
            required: true,
        },
        options: {
            type: Object,
            default: () => ({}),
        },
        data: {
            type: [Object, Array, String],
            default: undefined,
        },
        fetchOptions: {
            type: Object,
            default: undefined,
        },
        typeOptions: {
            type: Object,
            default: undefined,
        },
    },
    setup(props: HtmlDynamicLayoutProps) {
        const vm = getCurrentInstance() as ComponentRenderProxy;
        const state = reactive({
            layoutName: computed(() => (props.options.translation_id ? vm.$t(props.options.translation_id) : props.name)),
            rootData: computed<any[]>(() => {
                if (props.options.root_path) {
                    return get(props.data, props.options.root_path, '');
                }
                if (typeof props.data !== 'string') return '';
                return props.data;
            }),
            iframeData: computed(() => DOMPurify.sanitize(state.rootData, { allowAttributes: { a: ['target'] } })),
        });


        const resizeIframe = (e) => {
            e.target.style.height = `${e.target.contentDocument.documentElement.scrollHeight}px`;
        };
        const onLoadIFrame = (e) => {
            const el = document.createElement('style');
            el.textContent = iframeStyle;
            e.target.contentDocument.head.appendChild(el);
            resizeIframe(e);
        };

        return {
            ...toRefs(state),
            onLoadIFrame,
        };
    },
};
</script>

<style lang="postcss">
.p-dynamic-layout-html {
    .inner {
        width: 100%;
        min-height: 15rem;
        overflow-y: auto;
    }
    iframe {
        width: 100%;
        padding: 0 0.5rem;
    }
}
</style>
