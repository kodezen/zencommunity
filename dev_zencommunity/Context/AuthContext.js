import { current_logged_user } from '@Utils/helper';
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    username: current_logged_user?.user_id ? current_logged_user?.username : null,
    role: current_logged_user?.user_id ? current_logged_user?.usertype : null,
  });
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);