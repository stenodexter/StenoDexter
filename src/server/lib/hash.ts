import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Compare plain password with hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}
