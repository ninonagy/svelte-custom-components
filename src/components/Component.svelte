<script>
  export let name = "world";
  export let onEvent;
</script>

<style>
  .name {
    color: green;
    cursor: pointer;
  }
</style>

<h1 class="class" on:click={onEvent(`Hi, ${name}!`)}>
  <slot />, <span class="name">{name}</span>!
</h1>
