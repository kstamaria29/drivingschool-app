import { supabase } from "../../supabase/client";

export type UpdateMyNameInput = {
  firstName: string;
  lastName: string;
};

export type UpdateMyDetailsInput = {
  firstName: string;
  lastName: string;
  email: string;
  contactNo?: string;
  address?: string;
};

export async function updateMyName(input: UpdateMyNameInput) {
  const { error } = await supabase.rpc("set_my_name", {
    first_name: input.firstName,
    last_name: input.lastName,
  });

  if (error) throw error;
}

export async function updateMyDetails(input: UpdateMyDetailsInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedContact = input.contactNo?.trim() ?? "";
  const normalizedAddress = input.address?.trim() ?? "";

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;

  const currentAuthEmail = user?.email?.trim().toLowerCase() ?? null;
  if (currentAuthEmail && currentAuthEmail !== normalizedEmail) {
    const { error: updateEmailError } = await supabase.auth.updateUser({ email: normalizedEmail });
    if (updateEmailError) throw updateEmailError;
  }

  const { error } = await supabase.rpc("set_my_profile_details", {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: normalizedEmail,
    contact_no: normalizedContact.length ? normalizedContact : null,
    address: normalizedAddress.length ? normalizedAddress : null,
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

export type UpdateMyRoleDisplayInput = {
  roleDisplayName: string;
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

export async function updateMyRoleDisplay(input: UpdateMyRoleDisplayInput) {
  const { error } = await supabase.rpc("set_my_role_display_name", {
    new_role_display_name: input.roleDisplayName,
  });
  if (error) throw error;
}
