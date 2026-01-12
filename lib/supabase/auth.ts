'use client';

import { createSupabaseClient } from './supabaseClient';
import type { User, AuthError, Session } from '@supabase/supabase-js';

export interface SignUpCredentials {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Signs up a new user with email and password
 */
export async function signUp(credentials: SignUpCredentials): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: credentials.metadata || {},
    },
  });

  return {
    user: data.user,
    session: data.session,
    error: error as AuthError | null,
  };
}

/**
 * Signs in an existing user with email and password
 */
export async function signIn(credentials: SignInCredentials): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  return {
    user: data.user,
    session: data.session,
    error: error as AuthError | null,
  };
}

/**
 * Signs out the current user
 */
export async function signOut(): Promise<{
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase.auth.signOut();

  return {
    error: error as AuthError | null,
  };
}

/**
 * Gets the current session
 */
export async function getSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.getSession();

  return {
    session: data.session,
    error: error as AuthError | null,
  };
}

/**
 * Gets the current user
 */
export async function getUser(): Promise<{
  user: User | null;
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  return {
    user: user,
    error: error as AuthError | null,
  };
}

/**
 * Resets password for a user
 */
export async function resetPassword(email: string): Promise<{
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  return {
    error: error as AuthError | null,
  };
}

/**
 * Updates the current user's password
 */
export async function updatePassword(newPassword: string): Promise<{
  error: AuthError | null;
}> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return {
    error: error as AuthError | null,
  };
}
