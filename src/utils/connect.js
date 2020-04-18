/**
 * Connect Web Component attributes to Svelte Component properties
 * @param {string} name Name of the Web Component
 * @param {*} Component Svelte Component
 * @param {string[] | object} properties List of named props or object with keyed prop names and type values
 */
export default function connect(name, Component, properties = []) {
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
