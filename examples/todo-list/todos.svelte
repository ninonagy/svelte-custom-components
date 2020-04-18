<script>
  export let todos = [];
</script>

<ol>
  {#each todos as todo, i}
    <li>{todo.text}</li>
  {/each}
</ol>
