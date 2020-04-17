import connect from "./utils/connect";

import Component from "./components/Component.svelte";

connect("svelte-component", Component, {
    name: String,
    onEvent: Function
});
