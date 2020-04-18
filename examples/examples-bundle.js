(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.components = {}));
}(this, (function (exports) { 'use strict';

    /**
     * Connect Web Component attributes to Svelte Component properties
     * @param {string} name Name of the Web Component
     * @param {*} Component Svelte Component
     * @param {string[] | object} properties List of named props or object with keyed prop names and type values
     */
    function connect(name, Component, properties = []) {
        return customElements.define(
            name,
            class extends HTMLElement {
                constructor() {
                    super();
                    this.props = {};
                    this.bindings = {};
                    this.component = undefined;

                    // Assign default type to prop if types not specified
                    if (properties instanceof Array) {
                        for (let i in properties) {
                            this.props[properties[i]] = String;
                        }
                    }
                    // Assign type to name of prop
                    else if (properties instanceof Object) {
                        for (let p in properties) {
                            this.props[p] = properties[p];
                        }
                    }

                    this.getBinding = path => {
                        let paths = path.split(".");
                        if (paths.length) {
                            var binding = window;

                            for (var i = 0; i < paths.length - 1; i++) {
                                if (typeof binding[paths[i]] === "undefined")
                                    return;
                                binding = binding[paths[i]];
                            }

                            // get the property of binding
                            let property = path.substring(
                                path.lastIndexOf(".") + 1
                            );

                            let bound = {
                                path: paths,
                                value: binding,
                                property: property
                            };

                            return bound;
                        }
                    };

                    this.validateProp = function(name, type, value) {
                        let val = undefined;
                        if (value == undefined) return val;
                        let boundObject = this.getBinding(value);
                        // object.property
                        if (boundObject) {
                            this.bindings[name] = boundObject;
                            val = boundObject.value[boundObject.property];
                            if (val.constructor != type) throw TypeError(`${val.constructor.name} expected, ${type.name} is not the right type for '${boundObject.path.join('.')}'`);
                        } else if (type == String) {
                            val = value;
                        } else if (type == Number) {
                            val = Number(value);
                        } else if (type == Boolean) {
                            val = value == "" || value == name ? true : false;
                        }
                        return val;
                    };
                }

                static get observedAttributes() {
                    let attributes = [];
                    // add array values
                    if (properties instanceof Array) {
                        for (let i in properties) {
                            attributes.push(properties[i].toLowerCase());
                        }
                    }
                    // add object keys
                    else if (properties instanceof Object) {
                        for (let p in properties) {
                            attributes.push(p.toLowerCase());
                        }
                    }
                    return attributes;
                }

                attributeChangedCallback(name, oldValue, newValue) {
                    name = Object.keys(properties).find(
                        n => n.toLowerCase() == name
                    );

                    let type = this.props[name];
                    oldValue = this.validateProp(name, type, oldValue);
                    newValue = this.validateProp(name, type, newValue);

                    if (this.component && oldValue !== newValue) {
                        this.component.$set({ [name]: newValue });
                    }
                }

                connectedCallback() {
                    let props = {};

                    for (let p in this.props) {
                        props[p] = this.validateProp(
                            p,
                            this.props[p],
                            this.getAttribute(p)
                        );
                    }

                    var s = slot_node => {
                        return [
                            function create_slot(ctx) {
                                let node;

                                return {
                                    c() {
                                        node = slot_node;
                                    },
                                    m(target, anchor) {
                                        target.insertBefore(node, anchor || null);
                                    },
                                    p: function noop() {},
                                    d(detaching) {
                                        if (detaching) {
                                            node.parentNode.removeChild(node);
                                        }
                                    }
                                };
                            }
                        ];
                    };

                    // Find text node on first level if it exists
                    let textNode = this.firstChild;
                    let textContent = " ";
                    while (textNode) {
                        if (
                            textNode.nodeType == Node.TEXT_NODE &&
                            textNode.textContent.trim() != ""
                        ) {
                            textContent = textNode.textContent.trim();
                            break;
                        }
                        textNode = textNode.nextSibling;
                    }

                    let slots =
                        this.children.length || textNode
                            ? {
                                  default: [
                                      s(document.createTextNode(textContent))[0]
                                  ]
                              }
                            : {};

                    for (let child of this.children) {
                        let slot_node = child.cloneNode(true);

                        // named slot
                        if (child.hasAttribute("slot")) {
                            slots[child.getAttribute("slot")] = [s(slot_node)[0]];
                        }
                        // default slot
                        else {
                            slots["default"] = [s(slot_node)[0]];
                        }
                    }

                    props["$$slots"] = { ...slots };
                    props["$$scope"] = {};

                    // empty element
                    while (this.firstChild) {
                        this.removeChild(this.lastChild);
                    }

                    this.component = new Component({
                        target: this,
                        props
                    });

                    // get/set functions for DOM object
                    let comp = this.component;
                    for (var name in this.props) {
                        (function(name) {
                            this[
                                "get" + name[0].toUpperCase() + name.slice(1)
                            ] = function() {
                                var index = comp.$$.props[name];
                                return comp.$$.ctx[index];
                            };

                            this[
                                "set" + name[0].toUpperCase() + name.slice(1)
                            ] = function(val) {
                                comp.$set({ [name]: val });
                            };
                        }.call(this, name));
                    }

                    for (var name in this.bindings) {
                        let binding = this.bindings[name];
                        Object.defineProperty(binding.value, binding.property, {
                            get: this[
                                "get" + name[0].toUpperCase() + name.slice(1)
                            ],
                            set: this["set" + name[0].toUpperCase() + name.slice(1)]
                        });
                    }

                    // update when internal state changes
                    if (this.bindings) {
                        let _this = this;
                        const update = this.component.$$.update;
                        this.component.$$.update = function() {
                            for (var name in _this.bindings) {
                                const index = comp.$$.props[name];
                                let binding = _this.bindings[name];
                                binding.value[binding.property] = comp.$$.ctx[index];
                            }
                            update.apply(null, arguments);
                        };
                    }
                }

                disconnectedCallback() {
                    this.component.$destroy();
                }
            }
        );
    }

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /* examples\text-rendering\text-renderer.svelte generated by Svelte v3.20.1 */

    function create_fragment(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*message*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*message*/ 1) set_data(t, /*message*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { message = "" } = $$props;

    	$$self.$set = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	return [message];
    }

    class Text_renderer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { message: 0 });
    	}
    }

    /* examples\todo-list\todos.svelte generated by Svelte v3.20.1 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    // (6:2) {#each todos as todo, i}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*todo*/ ctx[1].text + "";
    	let t;

    	return {
    		c() {
    			li = element("li");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*todos*/ 1 && t_value !== (t_value = /*todo*/ ctx[1].text + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let ol;
    	let each_value = /*todos*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    		},
    		m(target, anchor) {
    			insert(target, ol, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ol, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*todos*/ 1) {
    				each_value = /*todos*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ol, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ol);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { todos = [] } = $$props;

    	$$self.$set = $$props => {
    		if ("todos" in $$props) $$invalidate(0, todos = $$props.todos);
    	};

    	return [todos];
    }

    class Todos extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { todos: 0 });
    	}
    }

    /* examples\custom-input\custom-input.svelte generated by Svelte v3.20.1 */

    function create_fragment$2(ctx) {
    	let input;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "type", "text");
    		},
    		m(target, anchor, remount) {
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);
    			if (remount) dispose();
    			dispose = listen(input, "input", /*input_input_handler*/ ctx[1]);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(input);
    			dispose();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { value = "" } = $$props;

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [value, input_input_handler];
    }

    class Custom_input extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { value: 0 });
    	}
    }

    /* examples\slots\alert-box.svelte generated by Svelte v3.20.1 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-jikbr5-style";
    	style.textContent = ".demo-alert-box.svelte-jikbr5{font-family:\"Source Sans Pro\", \"Helvetica Neue\", Arial, sans-serif;-webkit-font-smoothing:antialiased;color:#304455;font-size:14px;user-select:none;padding:10px 20px;background:#f3beb8;border:1px solid #f09898;margin-top:0;margin-bottom:0}";
    	append(document.head, style);
    }

    function create_fragment$3(ctx) {
    	let div;
    	let strong;
    	let t1;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Error!";
    			t1 = space();
    			if (default_slot) default_slot.c();
    			attr(div, "class", "demo-alert-box svelte-jikbr5");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, strong);
    			append(div, t1);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots];
    }

    class Alert_box extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-jikbr5-style")) add_css();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* examples\image\image-container.svelte generated by Svelte v3.20.1 */

    function create_fragment$4(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_width_value;
    	let t0;
    	let button0;
    	let t2;
    	let button1;
    	let t4;
    	let button2;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "-";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Change";
    			t4 = space();
    			button2 = element("button");
    			button2.textContent = "+";
    			if (img.src !== (img_src_value = /*options*/ ctx[0].url)) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "width", img_width_value = /*options*/ ctx[0].width);
    		},
    		m(target, anchor, remount) {
    			insert(target, div, anchor);
    			append(div, img);
    			append(div, t0);
    			append(div, button0);
    			append(div, t2);
    			append(div, button1);
    			append(div, t4);
    			append(div, button2);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen(button0, "click", function () {
    					if (is_function(/*options*/ ctx[0].handleMinus)) /*options*/ ctx[0].handleMinus.apply(this, arguments);
    				}),
    				listen(button1, "click", function () {
    					if (is_function(/*options*/ ctx[0].changeImage)) /*options*/ ctx[0].changeImage.apply(this, arguments);
    				}),
    				listen(button2, "click", function () {
    					if (is_function(/*options*/ ctx[0].handlePlus)) /*options*/ ctx[0].handlePlus.apply(this, arguments);
    				})
    			];
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*options*/ 1 && img.src !== (img_src_value = /*options*/ ctx[0].url)) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*options*/ 1 && img_width_value !== (img_width_value = /*options*/ ctx[0].width)) {
    				attr(img, "width", img_width_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { options } = $$props;

    	$$self.$set = $$props => {
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    	};

    	return [options];
    }

    class Image_container extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { options: 0 });
    	}
    }

    exports.AlertBox = Alert_box;
    exports.CustomInput = Custom_input;
    exports.ImageContainer = Image_container;
    exports.TextRenderer = Text_renderer;
    exports.Todos = Todos;
    exports.connect = connect;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
