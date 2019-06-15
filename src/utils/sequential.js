const sequential = async arr => {
  const answers = Array(arr.length);
  await arr.reduce(async (prevPromise, nextPromise, index) => {
    return prevPromise.then(async () => {
      answers[index] = typeof nextPromise === 'function' ? await nextPromise() : await nextPromise;
    });
  }, Promise.resolve());
  return answers;
};

module.exports = sequential;
