import connect from "../src/utils/connect";

import TextRenderer from "./text-rendering/text-renderer.svelte";
import Todos from "./todo-list/todos.svelte";
import CustomInput from "./custom-input/custom-input.svelte";
import AlertBox from "./slots/alert-box.svelte";
import ImageContainer from "./image/image-container.svelte";

export { connect, TextRenderer, Todos, CustomInput, AlertBox, ImageContainer };
