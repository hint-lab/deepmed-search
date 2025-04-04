'use client';

import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export interface ILoginRequestBody {
  email: string;
  password: string;
}

export interface IRegisterRequestBody extends ILoginRequestBody {
  nickname: string;
}

export const useLogin = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async (params: ILoginRequestBody) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: params.email,
        password: params.password,
        redirect: false,
      });

      if (!result?.error) {
        toast.success(t('message.logged') || 'Login successful');
        router.push('/knowledge');
        return 0; // 保持原有返回值约定
      } else {
        toast.error(result.error || t('message.loginFailed') || 'Login failed');
        return 1;
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(t('message.loginFailed') || 'Login failed');
      return -1;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};

export const useRegister = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const register = async (params: IRegisterRequestBody) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (data.code === 0) {
        toast.success(t('message.registered') || 'Registration successful');
      } else if (data.message && data.message.includes('registration is disabled')) {
        toast.error(t('message.registerDisabled') || 'User registration is disabled');
      } else {
        toast.error(data.message || t('message.registerFailed') || 'Registration failed');
      }
      return data.code;
    } catch (error) {
      console.error('Register failed:', error);
      toast.error(t('message.registerFailed') || 'Registration failed');
      return -1;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading };
};

export const useLogout = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await signOut({ redirect: false });
      toast.success(t('message.logout') || 'Logout successful');
      router.push('/login');
      return 0;
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error(t('message.logoutFailed') || 'Logout failed');
      return -1;
    } finally {
      setLoading(false);
    }
  };

  return { logout, loading };
};
