export function lazy<T>(fn: () => T): () => T {
  let output;
  let processed = false;

  return () => {
    if (!processed) {
      output = fn();
      processed = true;
    }    
    return output;
  }
}
