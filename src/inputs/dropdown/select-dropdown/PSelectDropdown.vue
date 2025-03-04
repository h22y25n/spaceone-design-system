<template>
    <div v-click-outside="onClickOutside" class="p-select-dropdown"
         :class="{
             [type] : !readOnly,
             invalid,
             disabled,
             active: proxyVisibleMenu && !readOnly,
             ...cssClassRelatedOutline,
         }"
    >
        <p-icon-button v-if="type === SELECT_DROPDOWN_TYPE.ICON_BUTTON"
                       ref="targetRef"
                       :name="buttonIcon || (proxyVisibleMenu ? 'ic_arrow_top' : 'ic_arrow_bottom')"
                       :activated="proxyVisibleMenu"
                       :disabled="disabled"
                       color="inherit"
                       class="dropdown-icon"
                       @click="onClick"
                       @keydown.down="onPressDownKey"
        />
        <p-button v-else
                  ref="targetRef"
                  :disabled="disabled"
                  :tabindex="0"
                  class="dropdown-button"
                  :class="{'read-only': readOnly}"
                  :style-type="isButtonType && !readOnly ? buttonStyleType : undefined"
                  :outline="type === SELECT_DROPDOWN_TYPE.OUTLINE_BUTTON"
                  @click="onClick"
                  @keydown.down="onPressDownKey"
        >
            <span class="text" :class="{placeholder: !$scopedSlots.default && !selectedItem}">
                <slot name="default">
                    {{
                        selectedItem ?
                            (selectedItem.label || selectedItem.name || '') :
                            (placeholder || $t('COMPONENT.SELECT_DROPDOWN.SELECT'))
                    }}
                </slot>
            </span>

            <p-i v-if="type === SELECT_DROPDOWN_TYPE.DEFAULT && !(withoutOutline && readOnly)"
                 :name="proxyVisibleMenu ? 'ic_arrow_top' : 'ic_arrow_bottom'"
                 :activated="proxyVisibleMenu"
                 :disabled="disabled"
                 color="inherit"
                 class="dropdown-icon"
                 :class="{ 'gray-svg': readOnly }"
            />
            <p-i v-else-if="isButtonType"
                 :name="proxyVisibleMenu ? 'ic_tree_arrow--opened' : 'ic_tree_arrow--opened'"
                 :activated="proxyVisibleMenu"
                 :disabled="disabled"
                 color="inherit"
                 class="dropdown-icon"
                 :class="{ 'gray-svg': readOnly }"
                 width="1rem"
                 height="1rem"
            />
        </p-button>
        <p-context-menu v-show="proxyVisibleMenu"
                        ref="contextMenuRef"
                        :class="menuPosition"
                        :menu="items"
                        :loading="loading"
                        :invalid="invalid"
                        :style="{
                            ...contextMenuStyle,
                            ...(type === SELECT_DROPDOWN_TYPE.ICON_BUTTON && {width: 'auto'}),
                        }"
                        @select="onSelectMenu"
        >
            <template v-for="(_, slot) of menuSlots" v-slot:[slot]="scope">
                <slot :name="`menu-${slot}`" v-bind="scope" />
            </template>
        </p-context-menu>
    </div>
</template>

<script lang="ts">
import { groupBy, reduce } from 'lodash';
import vClickOutside from 'v-click-outside';

import {
    ComponentRenderProxy,
    computed,
    defineComponent,
    getCurrentInstance,
    reactive,
    toRefs,
} from '@vue/composition-api';

import PContextMenu from '@/inputs/context-menu/PContextMenu.vue';
import PButton from '@/inputs/buttons/button/PButton.vue';

import { useContextMenuFixedStyle } from '@/hooks/context-menu-fixed-style';

import { MenuItem } from '@/inputs/context-menu/type';
import { BUTTON_STYLE } from '@/inputs/buttons/button/type';
import { makeOptionalProxy } from '@/util/composition-helpers';
import PIconButton from '@/inputs/buttons/icon-button/PIconButton.vue';
import PI from '@/foundation/icons/PI.vue';
import {
    SELECT_DROPDOWN_TYPE,
    CONTEXT_MENU_POSITION,
    SelectDropdownProps,
} from '@/inputs/dropdown/select-dropdown/type';


export default defineComponent<SelectDropdownProps>({
    name: 'PSelectDropdown',
    directives: {
        clickOutside: vClickOutside.directive,
    },
    components: {
        PI,
        PIconButton,
        PButton,
        PContextMenu,
    },
    model: {
        prop: 'selected',
        event: 'update:selected',
    },
    props: {
        /* context menu fixed style props */
        useFixedMenuStyle: {
            type: Boolean,
            default: false,
        },
        visibleMenu: {
            type: Boolean,
            default: undefined,
        },
        /* context menu props */
        invalid: {
            type: Boolean,
            default: false,
        },
        loading: {
            type: Boolean,
            default: false,
        },
        /* select dropdown props */
        items: {
            type: Array,
            default: () => [],
        },
        selected: {
            type: [String, Number],
            default: undefined,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        indexMode: {
            type: Boolean,
            default: false,
        },
        placeholder: {
            type: String,
            default: '',
        },
        withoutOutline: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            default: SELECT_DROPDOWN_TYPE.DEFAULT,
            validator: (value: SELECT_DROPDOWN_TYPE) => Object.values(SELECT_DROPDOWN_TYPE).includes(value),
        },
        buttonStyleType: {
            type: String,
            default: BUTTON_STYLE['primary-dark'],
            validator: (value: any) => {
                if (value === undefined) return true;
                return Object.values(BUTTON_STYLE).includes(value);
            },
        },
        buttonIcon: {
            type: String,
            default: undefined,
        },
        menuPosition: {
            type: String,
            default: CONTEXT_MENU_POSITION.RIGHT,
            validator: (value: CONTEXT_MENU_POSITION) => Object.values(CONTEXT_MENU_POSITION).includes(value),
        },
        readOnly: {
            type: Boolean,
            default: false,
        },
    },
    setup(props: SelectDropdownProps, { emit, slots }) {
        const vm = getCurrentInstance() as ComponentRenderProxy;

        const {
            proxyVisibleMenu, targetRef, targetElement, contextMenuStyle,
        } = useContextMenuFixedStyle({
            useFixedMenuStyle: computed(() => props.useFixedMenuStyle),
            visibleMenu: computed(() => props.visibleMenu),
        });
        const contextMenuFixedStyleState = reactive({
            proxyVisibleMenu, targetRef, targetElement, contextMenuStyle,
        });

        const state = reactive({
            contextMenuRef: null as null|any,
            proxySelected: makeOptionalProxy('selected', vm, props.selected),
            selectedItem: computed<MenuItem|null>(() => {
                if (!Array.isArray(props.items)) return null;

                if (props.indexMode) return props.items[state.proxySelected ?? ''] || null;

                const data = groupBy(props.items, 'name')[state.proxySelected ?? ''];
                if (Array.isArray(data)) return data[0] || null;

                return null;
            }),
            menuSlots: computed(() => reduce(slots, (res, d, name) => {
                if (name.startsWith('menu-')) res[`${name.substring(5)}`] = d;
                return res;
            }, {})),
            buttonSlots: computed(() => reduce(slots, (res, d, name) => {
                if (name.startsWith('button-') || name === 'button-default') {
                    res[`${name.substring(7)}`] = d;
                }
                return res;
            }, {})),
            isButtonType: computed(() => {
                if (props.type === SELECT_DROPDOWN_TYPE.OUTLINE_BUTTON || props.type === SELECT_DROPDOWN_TYPE.BUTTON) return true;
                return false;
            }),
            cssClassRelatedOutline: computed(() => {
                const { type, withoutOutline, readOnly } = props;
                return ({
                    'without-outline': withoutOutline && (type === SELECT_DROPDOWN_TYPE.DEFAULT),
                    ...(readOnly && {
                        'read-only': readOnly,
                        'read-only-outline': type !== SELECT_DROPDOWN_TYPE.DEFAULT || !withoutOutline,
                        none: type === SELECT_DROPDOWN_TYPE.ICON_BUTTON,
                    }),
                });
            }),
        });


        /* Event Handlers */
        const onSelectMenu = (item: MenuItem, index, event) => {
            if (props.indexMode) {
                emit('select', index, event);
                state.proxySelected = index;
            } else {
                emit('select', item.name, event);
                state.proxySelected = item.name;
            }
            contextMenuFixedStyleState.proxyVisibleMenu = false;
        };
        const onClick = (e: MouseEvent) => {
            if (props.readOnly) return;
            contextMenuFixedStyleState.proxyVisibleMenu = !contextMenuFixedStyleState.proxyVisibleMenu;
            e.stopPropagation();
        };
        const onClickOutside = (): void => {
            contextMenuFixedStyleState.proxyVisibleMenu = false;
        };
        const onPressDownKey = () => {
            if (!contextMenuFixedStyleState.proxyVisibleMenu) contextMenuFixedStyleState.proxyVisibleMenu = true;
            vm.$nextTick(() => {
                if (state.contextMenuRef) {
                    if (slots['menu-menu']) emit('focus-menu');
                    else state.contextMenuRef.focus();
                }
            });
        };
        return {
            ...toRefs(state),
            ...toRefs(contextMenuFixedStyleState),
            onClickOutside,
            onSelectMenu,
            onClick,
            onPressDownKey,
            SELECT_DROPDOWN_TYPE,
        };
    },
});
</script>

<style lang="postcss">
.p-select-dropdown {
    @apply rounded-md;
    position: relative;
    display: inline-block;
    min-width: 6.5rem;

    .dropdown-button {
        min-width: unset;
        width: 100%;
        display: inline-flex;
        justify-content: space-between;
        padding: 0 0.25rem 0 0.5rem;
        margin-right: -1px;
        font-weight: normal;
        text-align: left;

        .text {
            flex-grow: 1;
            flex-shrink: 0;
        }
        .dropdown-icon {
            flex-shrink: 0;
        }

        &:not(.read-only):focus, &:not(.read-only):active {
            @apply border-secondary text-secondary;
            outline: none;
        }
    }
    &.default {
        .dropdown-button {
            @apply bg-white text-gray-900 border-gray-300;
        }
    }
    &.button {
        .dropdown-button {
            @apply font-bold;
        }
    }
    &.outline-button {
        .dropdown-button {
            @apply font-bold;
        }
    }
    &.icon-button {
        min-width: unset;
    }

    &.without-outline {
        min-width: unset;
        .dropdown-button {
            @apply border-transparent bg-transparent;
            padding-left: 0;
            &:focus, &:active {
                @apply border-transparent;
            }
        }
    }
    &.read-only {
        .dropdown-button {
            cursor: default;
        }
    }
    &.read-only-outline {
        .dropdown-button {
            @apply border border-solid border-gray-300 font-normal;
        }
    }
    .gray-svg {
        @apply text-gray-300;
    }
    &.none {
        display: none;
    }

    .p-context-menu {
        position: absolute;
        margin-top: -1px;
        z-index: 1000;
        min-width: 100%;
        width: auto;

        &.left {
            right: 0;
        }
        &.right {
            right: unset;
        }
    }

    /* disabled */
    &.disabled {
        .dropdown-button {
            @apply bg-gray-100 text-gray-300;
            cursor: not-allowed;
        }
        &.without-outline {
            .dropdown-button {
                @apply bg-transparent;
            }
        }
        &.button {
            .dropdown-button {
                @apply bg-gray-200 text-gray-400;
            }
        }
        &.outline-button {
            .dropdown-button {
                @apply bg-transparent text-gray-300 border-gray-300;
            }
        }
    }

    /* invalid */
    &:not(.disabled):not(.without-outline).invalid {
        .dropdown-button {
            @apply border border-alert;
            &:focus, &:active {
                @apply border border-alert;
            }
        }
    }

    /* active */
    &:not(.invalid):not(.disabled):not(.without-outline).active {
        &.default {
            .dropdown-button {
                @apply border-secondary text-secondary bg-white;
            }
        }
        &.button {
            .dropdown-button {
                @apply border-secondary text-white bg-secondary;
                .dropdown-icon {
                    transform: rotate(180deg);
                }
            }
        }
        &.outline-button {
            .dropdown-button {
                @apply border-secondary text-secondary bg-white;
                .dropdown-icon {
                    transform: rotate(180deg);
                }
            }
        }
    }

    /* hover */
    &:not(.invalid):not(.disabled):not(.active):not(.without-outline) {
        &.default {
            .dropdown-button {
                @media (hover: hover) {
                    &:not(.active):not(.disabled):hover {
                        @apply border-blue-500;
                        .dropdown-icon {
                            @apply text-blue-500;
                        }
                    }
                }
            }
        }
        &.button {
            .dropdown-button {
                @media (hover: hover) {
                    &:not(.active):not(.disabled):hover {
                        @apply bg-secondary text-white;
                    }
                }
            }
        }
        &.outline-button {
            .dropdown-button {
                @media (hover: hover) {
                    &:not(.active):not(.disabled):hover {
                        @apply bg-white text-secondary border-secondary;
                    }
                }
            }
        }
    }

    &:not(.disabled):not(.active).without-outline {
        &.default {
            .dropdown-button {
                @media (hover: hover) {
                    &:not(.active):not(.disabled):hover {
                        @apply text-secondary;
                    }
                }
            }
        }
    }
}
</style>
