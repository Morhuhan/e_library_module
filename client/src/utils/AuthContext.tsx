import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import Cookies from 'js-cookie';
import httpClient from './httpsClient.tsx';

type Role = 'ADMIN' | 'LIBRARIAN' | null;

interface AuthState {
  username: string | null;
  role: Role;
  loading: boolean;
  setAuth: (data: { username: string; role: Role }) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Omit<AuthState, 'setAuth' | 'clearAuth'>>({
    username: null, // Не используем Cookies.get('username') при инициализации
    role: null,
    loading: true,
  });

  const setAuth = useCallback(
    ({ username, role }: { username: string; role: Role }) => {
      Cookies.set('username', username);
      setState({ username, role, loading: false });
    },
    [],
  );

  const clearAuth = useCallback(() => {
    Cookies.remove('username');
    setState({ username: null, role: null, loading: false });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await httpClient.get('/auth/me');
        setAuth({ username: data.username, role: data.role });
      } catch (err) {
        clearAuth();
      }
    }
    if (Cookies.get('username')) {
      load();
    } else {
      clearAuth();
    }
  }, [setAuth, clearAuth]);

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};