import {jwtVerify, SignJWT} from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createToken(userId: string): Promise<string> {
  return await new SignJWT({userId})
    .setProtectedHeader({alg: "HS256"})
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

