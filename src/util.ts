export const calculateChecksum = (data: Uint8Array) => {
  let sum = 0
  for (let i = 0; i < data.length; ++i) {
    sum = (sum + data[i]) & 0x7f
  }
  return (128 - sum) & 0x7f
}
