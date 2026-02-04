import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { Profile } from "./api";

type CurrentUserValue = {
  userId: string;
  profile: Profile;
};

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

export function CurrentUserProvider({
  userId,
  profile,
  children,
}: PropsWithChildren<CurrentUserValue>) {
  return (
    <CurrentUserContext.Provider value={{ userId, profile }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return value;
}

