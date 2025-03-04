<template>
    <div class="p-search-dropdown">
        <p-search ref="targetRef"
                  v-model="proxyValue"
                  :placeholder="_placeholder"
                  :disable-icon="disableIcon || proxyVisibleMenu ||
                      (type === SEARCH_DROPDOWN_TYPE.radioButton && !!proxySelected.length)"
                  :is-focused.sync="proxyIsFocused"
                  :invalid="invalid"
                  :disabled="disabled"
                  :readonly="readonly"
                  :style="{height: `${searchHeight}px`}"
                  @delete="onDeleteSearchText"
                  @click.native.stop="handleClick"
                  v-on="searchListeners"
        >
            <div v-if="type === SEARCH_DROPDOWN_TYPE.radioButton &&
                     proxySelected.length &&
                     !proxyVisibleMenu &&
                     !proxyIsFocused"
                 ref="selectedRadioRef"
                 class="selected-radio-label"
            >
                <span><slot name="selected-radio-label" :selected="proxySelected[0]">{{ proxySelected[0].label || proxySelected[0].name }}</slot></span>
                <p-i class="delete-icon" name="ic_delete"
                     height="1rem" width="1rem"
                     @click="onDeleteTag(proxySelected[0], 0)"
                />
            </div>
            <template v-if="type !== SEARCH_DROPDOWN_TYPE.default || !proxySelected.length || proxyVisibleMenu" #right>
                <p-i :name="proxyVisibleMenu ? 'ic_arrow_top' : 'ic_arrow_bottom'"
                     color="inherit" class="dropdown-button" :class="disabled"
                     @click.stop="handleClickDropdownButton"
                />
            </template>
            <template v-for="(_, slot) of searchSlots" v-slot:[slot]="scope">
                <slot :name="`search-${slot}`" v-bind="{...scope}" />
            </template>
        </p-search>
        <p-context-menu v-show="proxyVisibleMenu"
                        ref="menuRef"
                        :menu="bindingMenu"
                        :loading="loading"
                        :strict-select-mode="strictSelectMode"
                        :selected.sync="proxySelected"
                        :multi-selectable="type === SEARCH_DROPDOWN_TYPE.checkbox"
                        :show-radio-icon="type === SEARCH_DROPDOWN_TYPE.radioButton"
                        :style="{...contextMenuStyle, maxWidth: contextMenuStyle.minWidth, width: contextMenuStyle.minWidth}"
                        @select="handleSelectMenuItem"
                        @keyup:up:end="focusSearch"
                        @keyup:esc="focusSearch"
                        @focus="onFocusMenuItem"
        >
            <template #item--format="{item}">
                <span class="p-search-dropdown__item-label">
                    <span v-for="(text, i) in item.label.split(searchRegex)"
                          :key="`item-label--${text}-${i}`"
                          :class="{ 'selected': type === SEARCH_DROPDOWN_TYPE.default && item.name === selectedNames[0] }"
                    >
                        <strong v-if="i !== 0">{{ getMatchText(item.label) }}</strong><span>{{ text }}</span>
                    </span>
                </span>
            </template>
            <template v-for="(_, slot) of menuSlots" v-slot:[slot]="scope">
                <slot :name="`menu-${slot}`" v-bind="scope" />
            </template>
        </p-context-menu>
        <div v-if="type === SEARCH_DROPDOWN_TYPE.checkbox && proxySelected.length && showTagBox" class="p-search-dropdown__tag-box">
            <p-tag v-for="(selectedItem, index) in proxySelected" :key="`tag-box-${index}`" :deletable="!disabled"
                   @delete="onDeleteTag(selectedItem, index)"
            >
                {{ selectedItem.label || selectedItem.name }}
            </p-tag>
        </div>
    </div>
</template>

<script lang="ts">
import {
    ComponentRenderProxy,
    computed, defineComponent, getCurrentInstance, onMounted, onUnmounted, reactive, toRefs, watch,
} from '@vue/composition-api';
import { reduce } from 'lodash';

import { makeOptionalProxy } from '@/util/composition-helpers';
import { useContextMenuFixedStyle } from '@/hooks/context-menu-fixed-style';

import PContextMenu from '@/inputs/context-menu/PContextMenu.vue';
import PSearch from '@/inputs/search/search/PSearch.vue';
import PI from '@/foundation/icons/PI.vue';
import PTag from '@/data-display/tags/PTag.vue';
import PIconButton from '@/inputs/buttons/icon-button/PIconButton.vue';
import PButton from '@/inputs/buttons/button/PButton.vue';

import {
    SEARCH_DROPDOWN_TYPE, SearchDropdownProps, SearchDropdownMenuItem,
} from '@/inputs/search/search-dropdown/type';

export default defineComponent<SearchDropdownProps>({
    name: 'PSearchDropdown',
    components: {
        PIconButton,
        PSearch,
        PContextMenu,
        PI,
        PTag,
        PButton,
    },
    model: {
        prop: 'value',
        event: 'update:value',
    },
    props: {
        /* search props */
        value: {
            type: String,
            default: '',
        },
        placeholder: {
            type: String,
            default: undefined,
        },
        disableIcon: {
            type: Boolean,
            default: false,
        },
        isFocused: {
            type: Boolean,
            default: undefined,
        },
        invalid: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        readonly: {
            type: Boolean,
            default: false,
        },
        /* context menu props */
        menu: {
            type: Array,
            default: () => [],
        },
        loading: {
            type: Boolean,
            default: false,
        },
        selected: {
            type: Array,
            default: () => [],
        },
        /* context menu fixed style props */
        visibleMenu: {
            type: Boolean,
            default: undefined,
        },
        useFixedMenuStyle: {
            type: Boolean,
            default: false,
        },
        /* extra props */
        type: {
            type: String,
            default: SEARCH_DROPDOWN_TYPE.default,
        },
        handler: {
            type: Function,
            default: undefined,
        },
        disableHandler: {
            type: Boolean,
            default: false,
        },
        exactMode: {
            type: Boolean,
            default: true,
        },
        showTagBox: {
            type: Boolean,
            default: true,
        },
        strictSelectMode: {
            type: Boolean,
            default: false,
        },
    },
    setup(props: SearchDropdownProps, { emit, slots, listeners }) {
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
            menuRef: null,
            selectedRadioRef: null as null|HTMLElement,
            proxyValue: makeOptionalProxy('value', vm, ''),
            proxyIsFocused: makeOptionalProxy('isFocused', vm, false),
            proxySelected: makeOptionalProxy('selected', vm, []),
            _placeholder: undefined as string|undefined,
            filteredMenu: [] as SearchDropdownMenuItem[],
            bindingMenu: computed<SearchDropdownMenuItem[]>(() => (props.disableHandler ? props.menu : state.filteredMenu)),
            searchableItems: computed<SearchDropdownMenuItem[]>(() => props.menu.filter(d => d.type === undefined || d.type === 'item')),
            searchRegex: computed(() => new RegExp(state.proxyValue || '', 'i')),
            selectedNames: computed(() => state.proxySelected.map(item => item.name)),
            //
            menuSlots: computed(() => reduce(slots, (res, d, name) => {
                if (name.startsWith('menu-')) res[`${name.substring(5)}`] = d;
                return res;
            }, {})),
            searchSlots: computed(() => reduce(slots, (res, d, name) => {
                if (name.startsWith('search-')) res[`${name.substring(7)}`] = d;
                return res;
            }, {})),
            searchHeight: computed<number>(() => {
                if (!state.selectedRadioRef) return 32;
                if (!contextMenuFixedStyleState.proxyVisibleMenu && state.proxySelected.length && props.type === SEARCH_DROPDOWN_TYPE.radioButton) return state.selectedRadioRef.clientHeight + 12;
                return 32;
            }),
        });

        const defaultHandler = (inputText: string, list: SearchDropdownMenuItem[]) => {
            let results: SearchDropdownMenuItem[] = [...list];
            const trimmed = inputText.trim();
            if (trimmed) {
                const regex = new RegExp(inputText, 'i');
                results = results.filter(d => regex.test(d.label as string));
            }
            return { results };
        };

        const filterMenu = async (val: string) => {
            if (props.disableHandler) return;

            if (props.handler) {
                let res = props.handler(val, state.searchableItems);
                if (res instanceof Promise) res = await res;
                state.filteredMenu = res.results;
            } else {
                const results = defaultHandler(val, state.searchableItems).results;

                const filtered = props.menu.filter((item) => {
                    if (item.type && item.type !== 'item') return true;
                    return !!results.find(d => d.label === item.label);
                });
                if (filtered[filtered.length - 1]?.type === 'divider') filtered.pop();
                state.filteredMenu = filtered;
            }
        };

        const getMatchText = (text: string): string => {
            const res = state.searchRegex.exec(text);
            if (res) return res[0];
            return '';
        };


        /* event util */
        const focusSearch = () => {
            if (state.proxyIsFocused) return;
            state.proxyIsFocused = true;
        };

        const hideMenu = (mode?: string) => {
            if (!contextMenuFixedStyleState.proxyVisibleMenu) return;
            // placeholder
            if (props.type === SEARCH_DROPDOWN_TYPE.radioButton && (mode === 'click' || state.proxySelected.length)) {
                state._placeholder = '';
            } else {
                state._placeholder = props.placeholder;
            }

            // value
            if (props.type === SEARCH_DROPDOWN_TYPE.default && mode !== 'click') {
                const item = state.proxySelected[0];
                if (item) state.proxyValue = item.label ?? item.name ?? '';
                else state.proxyValue = '';
            }
            if (props.type !== SEARCH_DROPDOWN_TYPE.default) {
                state.proxyValue = '';
            }

            contextMenuFixedStyleState.proxyVisibleMenu = false;
            emit('hide-menu');
        };

        const showMenu = () => {
            if (contextMenuFixedStyleState.proxyVisibleMenu) return;

            if (
                state.proxySelected.length && (
                    props.type === SEARCH_DROPDOWN_TYPE.default
                    || props.type === SEARCH_DROPDOWN_TYPE.radioButton
                )
            ) {
                // If there is an existing selected item, the value will be placeholder & filter will be initialized
                const selectedItem = state.proxySelected[0] as SearchDropdownMenuItem;
                state._placeholder = selectedItem.label ?? selectedItem.name ?? '';
                state.proxyValue = '';
                filterMenu('');
            } else {
                filterMenu(state.proxyValue);
            }

            contextMenuFixedStyleState.proxyVisibleMenu = true;
            emit('show-menu');
        };

        const focusMenu = () => {
            if (state.bindingMenu.length === 0) return;
            if (state.menuRef) state.menuRef.focus();
        };

        const allFocusOut = () => {
            if (!state.proxyIsFocused) return;
            state.proxyIsFocused = false;
            hideMenu();
        };


        /* event */
        const onFocusMenuItem = (index: string) => {
            emit('focus-menu', index);
        };

        const onFocusSearchInput = () => {
            showMenu();
        };

        const onDeleteTag = (item: SearchDropdownMenuItem, index: number) => {
            state.proxySelected.splice(index, 1);
            state.proxySelected = [...state.proxySelected];
            emit('delete-tag', item, index);
        };

        const onDeleteSearchText = () => {
            if (state.proxyValue) {
                state.proxyValue = '';
            }

            if (state.proxySelected.length === 0) return;

            if (props.type !== SEARCH_DROPDOWN_TYPE.default) return;

            const item = state.proxySelected[0];
            state.proxySelected.splice(0, 1);
            emit('delete-tag', item, 0);
        };

        const onInput = (val: string, e) => {
            if (!contextMenuFixedStyleState.proxyVisibleMenu) showMenu();

            state.proxyValue = val;
            emit('input', val, e);

            filterMenu(val);
        };

        const handleSelectMenuItem = (item: SearchDropdownMenuItem) => {
            if (props.type === SEARCH_DROPDOWN_TYPE.default || props.type === SEARCH_DROPDOWN_TYPE.radioButton) {
                hideMenu('click');
            }
            if (props.type === SEARCH_DROPDOWN_TYPE.default) {
                state.proxyValue = item.label ?? item.name ?? '';
            }

            emit('select-menu', item);
        };

        const onSearch = (val?: string) => {
            const trimmed = val?.trim() ?? '';
            const menuItem = state.filteredMenu.find(d => trimmed.toLowerCase() === d.label?.toLowerCase());
            if (menuItem) {
                emit('select-menu', menuItem);
                state.proxyValue = menuItem.label ?? menuItem.name ?? '';
                if (props.type === SEARCH_DROPDOWN_TYPE.default) {
                    state.proxySelected = [menuItem];
                } else if (!state.selectedNames.includes(menuItem.name)) {
                    state.proxySelected.push(menuItem);
                }
            } else if (props.type === SEARCH_DROPDOWN_TYPE.default) {
                state.proxySelected = [];
                state.proxyValue = '';
            }

            if (!menuItem && props.exactMode) {
                state.proxyValue = '';
                emit('search', '');
            } else {
                emit('search', trimmed);
            }

            vm.$nextTick(() => {
                allFocusOut();
            });
        };

        const onDelete = () => {
            emit('search', '');
            focusSearch();
        };

        const handleClickDropdownButton = () => {
            if (props.disabled) return;
            if (contextMenuFixedStyleState.proxyVisibleMenu) hideMenu();
            else showMenu();
        };

        const handleClick = (e) => {
            if (props.disabled) return;
            state.proxyIsFocused = true;
            showMenu();
            emit('click', e);
        };

        const searchListeners = {
            ...listeners,
            keyup(e) {
                if (e.key === 'ArrowDown' || e.key === 'Down') focusMenu();
                else if (e.key === 'Escape' || e.key === 'Esc') allFocusOut();
                emit('keyup', e);
            },
            focus(e) {
                onFocusSearchInput();
                emit('focus', e);
            },
            delete(...args) {
                onDelete();
                emit('delete', ...args);
            },
            search: onSearch,
            input: onInput,
        };

        const onWindowKeydown = (e: KeyboardEvent) => {
            if (contextMenuFixedStyleState.proxyVisibleMenu && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
            }
        };
        const forceHideMenu = () => {
            hideMenu();
        };
        onMounted(() => {
            window.addEventListener('click', forceHideMenu);
            window.addEventListener('blur', forceHideMenu);
            window.addEventListener('keydown', onWindowKeydown, false);
        });
        onUnmounted(() => {
            window.removeEventListener('click', forceHideMenu);
            window.removeEventListener('blur', forceHideMenu);
            window.removeEventListener('keydown', onWindowKeydown, false);
        });

        watch(() => props.menu, (menu) => {
            state.filteredMenu = menu;
            filterMenu(state.proxyValue);
        });

        watch(() => state.proxySelected, (proxySelected) => {
            if (!proxySelected.length) {
                state._placeholder = props.placeholder;
                if (props.type === SEARCH_DROPDOWN_TYPE.default) state.proxyValue = '';
                return;
            }

            if (props.type === SEARCH_DROPDOWN_TYPE.default) {
                const item = state.proxySelected[0];
                if (item) state.proxyValue = item.label ?? item.name ?? '';
                else state.proxyValue = '';
            } else if (props.type === SEARCH_DROPDOWN_TYPE.radioButton && state._placeholder !== '') {
                state._placeholder = '';
            }
        }, { immediate: true });
        return {
            ...toRefs(state),
            ...toRefs(contextMenuFixedStyleState),
            SEARCH_DROPDOWN_TYPE,
            getMatchText,
            handleSelectMenuItem,
            focusSearch,
            onFocusMenuItem,
            onDeleteTag,
            onDeleteSearchText,
            handleClickDropdownButton,
            handleClick,
            searchListeners,
        };
    },
});
</script>

<style lang="postcss">
.p-search-dropdown {
    @apply w-full relative;
    .p-search {
        @apply text-sm font-normal;
        &.disabled {
            @apply text-gray-300;
            .dropdown-button {
                cursor: default;
            }
        }
        &.focused:not(.disabled) {
            .dropdown-button {
                @apply text-secondary;
            }
        }
    }
    .selected-radio-label {
        @apply w-full flex justify-between items-center;
        line-height: 1.125rem;
    }
    .delete-icon {
        @apply min-w-4;
    }
    .dropdown-button {
        cursor: pointer;
        flex-shrink: 0;
    }
    .p-context-menu {
        @apply font-normal;
        position: absolute;
        margin-top: -1px;
        z-index: 1000;
        min-width: 100%;
        width: 100%;

        .context-header.secondary {
            @apply text-secondary;
        }
        .p-search-dropdown__item-label {
            flex-grow: 1;
            .selected {
                @apply text-secondary;
                font-weight: bold;
            }
        }
    }
    .p-search-dropdown__tag-box {
        @apply text-gray-900;
        margin-top: 0.625rem;
        .p-tag {
            align-items: center;
            margin-bottom: 0.5rem;
        }
    }
}
</style>
