<script>
  export let options;

//   const width = options.imageWidth;
//   const handleMinus = options.handleMinus;
//   const handlePlus = options.handlePlus;

  //   export let imageWidth = 500;
  //   export let handleMinus;
  //   export let handlePlus;
</script>

<div>
  <img
    src={options.url}
    alt=""
    width={options.width} />
  <button on:click={options.handleMinus}>-</button>
  <button on:click={options.changeImage}>Change</button>
  <button on:click={options.handlePlus}>+</button>
</div>
