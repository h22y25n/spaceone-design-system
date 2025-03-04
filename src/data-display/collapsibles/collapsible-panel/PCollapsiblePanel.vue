<template>
    <div class="p-collapsible-panel">
        <div class="contents">
            <div ref="fakeTextRef" class="text fake" :style="{'-webkit-line-clamp': lineClamp}">
                <slot />
            </div>
            <div class="text" :class="{collapsed: proxyIsCollapsed}" :style="{'-webkit-line-clamp': lineClamp}">
                <slot v-if="lineClamp !== 0 || !proxyIsCollapsed" />
            </div>
        </div>
        <p-collapsible-toggle v-if="lineClamp === 0 || isOverflow" v-model="proxyIsCollapsed" />
    </div>
</template>

<script lang="ts">
import {
    ComponentRenderProxy,
    defineComponent, getCurrentInstance, onMounted, onUnmounted, onUpdated, reactive, toRefs,
} from '@vue/composition-api';
import { debounce } from 'lodash';

import PCollapsibleToggle from '@/data-display/collapsibles/collapsible-toggle/PCollapsibleToggle.vue';
import { makeOptionalProxy } from '@/util/composition-helpers';
import { CollapsiblePanelProps } from '@/data-display/collapsibles/collapsible-panel/type';


export default defineComponent({
    name: 'PCollapsiblePanel',
    components: { PCollapsibleToggle },
    model: {
        prop: 'isCollapsed',
        event: 'update:isCollapsed',
    },
    props: {
        /* collapsible props */
        isCollapsed: {
            type: Boolean,
            default: true,
        },
        /* collapsible panel props */
        lineClamp: {
            type: Number,
            default: 2,
        },
    },
    setup(props: CollapsiblePanelProps) {
        const vm = getCurrentInstance() as ComponentRenderProxy;
        const state = reactive({
            proxyIsCollapsed: makeOptionalProxy('isCollapsed', vm, props.isCollapsed),
            fakeTextRef: null as null|HTMLElement,
            isOverflow: false,
        });

        /* util */
        const checkTextOverflow = debounce(() => {
            if (!state.fakeTextRef) return;
            state.isOverflow = state.fakeTextRef.scrollHeight > state.fakeTextRef.clientHeight;
        }, 150);

        onUpdated(() => {
            checkTextOverflow();
        });

        onMounted(() => {
            window.addEventListener('resize', checkTextOverflow);
            checkTextOverflow();
        });

        onUnmounted(() => {
            window.removeEventListener('resize', checkTextOverflow);
        });

        return {
            ...toRefs(state),
        };
    },
});
</script>

<style lang="postcss">
.p-collapsible-panel {
    width: 100%;
    padding: 0.625rem;
    .contents {
        position: relative;
        font-size: 0.75rem;
        line-height: 1.5;
        word-break: break-word;
        .text {
            &.collapsed, &.fake {
                display: -webkit-box;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            &.fake {
                position: absolute;
                visibility: hidden;
                top: 0;
                left: 0;
            }
        }
    }
}
</style>
