import "next-auth";

declare module "next-auth" {
  interface User {
    role?: "owner" | "consultant";
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "owner" | "consultant";
      image?: string | null;
    };
  }
}
