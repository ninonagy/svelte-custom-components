# svelte-custom-components

A simple utility that allows you to use [Svelte](https://svelte.dev/) components as Web Components, but without shadow DOM.

Suitable for testing and experimenting.

# Start

You need [Node](https://nodejs.org/en/) for this to install dependencies...

```bash
npm install
```

...then start [Rollup](https://rollupjs.org/):

```bash
npm run dev
```

It will start dev server and open browser on [localhost:5000](localhost:5000). Edit a component file in src, save it, and reload the page to see your changes.

## Use it

The [`connect`](https://github.com/ninonagy/svelte-custom-components/blob/master/src/utils/connect.js) utility function is a wraper that takes few options: tag name, Svelte component and list of properties that you want to pass to custom element.

In `src/index.js` you will use:

```js
import connect from "./utils/connect";
import Component from "./components/Component.svelte";

connect("custom-component", Component, { ...props });
```

Then in `index.html`:

```html
<custom-component attribute="value">
    Hello
</custom-component>
```

# Examples

Here we'll cover some basic examples following Vue.js guides like [here](https://vuejs.org/v2/guide/#Declarative-Rendering), just for fun. Additionally, there is this fancy Vue.js [adapter](https://github.com/pngwn/svelte-adapter) if you are wondering to use Svelte components inside Vue or React.

While it's not perfect, you can link data and DOM to make it 'reactive'. As you can see below, we are using app.message to control value of message property. Open browser's JavaScript console and set `app.message` to a different value... Nice! 

```html
<!-- index.html -->
<app-component message="app.message" />

<script>
  var app = {
    message: "Hello Svelte!"
  };
</script>

<!-- AppComponent.svelte -->
<script>
  export let message = "";
</script>

<div>{message}</div>
```
```js
// index.js
import AppComponent from "./components/AppComponent.svelte";

connect("app-component", AppComponent, {
  message: String
});
```





