<script>
  export let width;
  export let url;
  export let methods;
</script>

<style>
  .container {
    width: 100%;
    margin: 0 auto;
    max-width: 540px;
  }
</style>

<div class="container">
  <button on:click={methods.makeSmaller}>-</button>
  <button on:click={methods.makeLarger}>+</button>
  <p></p>
  <img src={url} alt="" {width} />
</div>
