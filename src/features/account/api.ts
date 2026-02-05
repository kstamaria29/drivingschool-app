import { supabase } from "../../supabase/client";

export type UpdateMyNameInput = {
  firstName: string;
  lastName: string;
};

export async function updateMyName(input: UpdateMyNameInput) {
  const { error } = await supabase.rpc("set_my_name", {
    first_name: input.firstName,
    last_name: input.lastName,
  });

  if (error) throw error;
}

export async function clearMyAvatar(userId: string) {
  const { data: objects, error: listError } = await supabase.storage
    .from("avatars")
    .list(userId, { limit: 100 });

  if (listError) throw listError;

  const toRemove = (objects ?? [])
    .filter((o) => !!o.name)
    .map((o) => `${userId}/${o.name}`);

  if (toRemove.length) {
    const { error: removeError } = await supabase.storage.from("avatars").remove(toRemove);
    if (removeError) throw removeError;
  }

  const { error: rpcError } = await supabase.rpc("clear_my_avatar_url");
  if (rpcError) throw rpcError;
}

export type ChangeMyPasswordInput = {
  oldPassword: string;
  newPassword: string;
};

export async function changeMyPassword(input: ChangeMyPasswordInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const email = userData.user?.email;
  if (!email) {
    throw new Error("Couldn't determine your email. Please sign out and sign in again.");
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: input.oldPassword,
  });
  if (reauthError) throw reauthError;

  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (updateError) throw updateError;

  const { error: rpcError } = await supabase.rpc("clear_my_must_change_password");
  if (rpcError) throw rpcError;
}

