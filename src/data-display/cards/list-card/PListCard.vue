<template>
    <p-card class="p-list-card" :header="header" :style-type="styleType"
            :class="{'no-data': items.length === 0, hoverable}"
    >
        <template v-if="$scopedSlots.header" #header>
            <slot name="header" />
        </template>
        <p-data-loader :data="items" :loading="loading" :spinner-size="1.5"
                       :disable-empty-case="disableEmptyCase"
        >
            <template #loader>
                <slot name="loader" />
            </template>
            <template #no-data>
                <slot name="no-data" />
            </template>
            <ul>
                <li v-for="(item, index) in items" :key="`${contextKey}-${index}`"
                    @click="$emit('click', index)"
                >
                    <slot name="item" v-bind="{item, index}">
                        {{ item }}
                    </slot>
                </li>
            </ul>
        </p-data-loader>
    </p-card>
</template>

<script lang="ts">

import {
    defineComponent, reactive, toRefs, watch,
} from '@vue/composition-api';
import PCard from '@/data-display/cards/card/PCard.vue';
import { CARD_STYLE_TYPE } from '@/data-display/cards/card/config';
import PDataLoader from '@/feedbacks/loading/data-loader/PDataLoader.vue';
import { CardProps } from '@/data-display/cards/card/type';

interface Props extends CardProps {
    items: any[];
    loading?: boolean;
    disableEmptyCase?: boolean;
    hoverable?: boolean;
}


export default defineComponent<Props>({
    name: 'PListCard',
    components: { PDataLoader, PCard },
    props: {
        /* card props */
        header: {
            type: [String, Boolean],
            default: '',
        },
        styleType: {
            type: String,
            default: CARD_STYLE_TYPE.gray100,
            validator(styleType: any) {
                return Object.values(CARD_STYLE_TYPE).includes(styleType);
            },
        },
        /* list card props */
        items: {
            type: Array,
            default: () => [],
        },
        loading: {
            type: Boolean,
            default: false,
        },
        disableEmptyCase: {
            type: Boolean,
            default: false,
        },
        hoverable: {
            type: Boolean,
            default: false,
        },
    },
    setup(props: Props) {
        const state = reactive({
            contextKey: Math.floor(Math.random() * Date.now()),
        });

        watch(() => props.items, (after, before) => {
            if (after !== before) state.contextKey = Math.floor(Math.random() * Date.now());
        });
        return {
            ...toRefs(state),
        };
    },
});
</script>

<style lang="postcss">
.p-list-card {
    &.p-card:not(.no-data) .body {
        padding: 0;
    }
    &.hoverable {
        li:hover {
            @apply bg-secondary2;
            cursor: pointer;
        }
    }
    li {
        @apply border-b border-gray-200;
        font-size: 0.875rem;
        line-height: 1.25;
        padding: 0.5rem 1rem;
        min-height: 2.25rem;
        &:last-of-type {
            @apply border-b-0 rounded-b-lg;
        }
    }
    .p-data-loader {
        height: 100%;
    }
}
</style>
