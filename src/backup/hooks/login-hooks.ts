import { Authorization } from '@/constants/authorization';
import userService from '@/services/user-service';
import authorizationUtil, { redirectToLogin } from '@/utils/authorization-util';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
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

  const login = async (params: ILoginRequestBody) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (data.code === 0) {
        tostat.success(t('message.logged'));
        const authorization = response.headers.get(Authorization);
        const token = data.data.access_token;
        const userInfo = {
          avatar: data.data.avatar,
          name: data.data.nickname,
          email: data.data.email,
        };
        authorizationUtil.setItems({
          Authorization: authorization || '',
          userInfo: JSON.stringify(userInfo),
          Token: token,
        });
      }
      return data.code;
    } catch (error) {
      console.error('Login failed:', error);
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
        message.success(t('message.registered'));
      } else if (data.message && data.message.includes('registration is disabled')) {
        message.error(t('message.registerDisabled') || 'User registration is disabled');
      }
      return data.code;
    } catch (error) {
      console.error('Register failed:', error);
      return -1;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading };
};

export const useLogout = () => {
  const { t } = useTranslation();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['logout'],
    mutationFn: async () => {
      const { data = {} } = await userService.logout();
      if (data.code === 0) {
        message.success(t('message.logout'));
        authorizationUtil.removeAll();
        redirectToLogin();
      }
      return data.code;
    },
  });

  return { data, loading, logout: mutateAsync };
};

export const useHandleSubmittable = (form: FormInstance) => {
  const [submittable, setSubmittable] = useState<boolean>(false);

  // Watch all values
  const values = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  return { submittable };
};
