export function randomSalt() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string) {
  const input = `debos:${salt}:${password}`;
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input)
    );
    return Array.from(new Uint8Array(buf), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
  }
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `fnv${(h1 >>> 0).toString(16)}`;
}

export async function passwordMatches(
  password: string,
  salt: string,
  digest: string
) {
  return (await hashPassword(password, salt)) === digest;
}
