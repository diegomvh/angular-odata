export const Arrays = {
  // Zip arrays
  // Example
  //   Arrays.zip([1, 2, 3, 4, 5, 6], ['a', 'b', 'c', 'd', 'e', 'f'])
  //   => [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e'], [6, 'f']]
  zip: (...arrays: any[][]) => {
    return arrays[0].map((_: any, i: number) =>
      arrays.map((array: any[]) => array[i]),
    );
  },
};
