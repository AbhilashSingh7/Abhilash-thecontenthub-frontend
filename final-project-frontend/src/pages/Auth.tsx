import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();
  // ADD: also access register from the auth context
  const { register: registerUser } = useAuth();

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [searchParams]);

  const handleLogin = async (email: string, password: string, userType: 'user' | 'admin') => {
    const success = await login(email, password);
    
    if (success) {
      toast.success("Login successful!");
      if (userType === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      toast.error("Invalid credentials. Try admin@moviedb.com/admin123 or user@moviedb.com/user123");
    }
  };

  const handleSignup = (name: string, email: string, password: string, userType: 'user' | 'admin') => {
    // ADD: real signup using backend; navigate on success; stop the old placeholder flow
    registerUser(name, email, password)
      .then((success) => {
        if (success) {
          toast.success(`${userType === 'admin' ? 'Admin' : 'User'} account created successfully!`);
          if (userType === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } else {
          toast.error("Sign up failed. Please try again.");
        }
      })
      .catch((err) => {
        console.error("Signup failed:", err);
        toast.error("Sign up failed. Please try again.");
      });
    return;

    // TODO: Implement actual signup logic with your backend
    console.log('Signup attempt:', { name, email, password, userType });
    
    toast.success(`${userType === 'admin' ? 'Admin' : 'User'} account created successfully!`);
    
    // For now, just redirect to home page
    navigate('/');
  };

  return (
    <>
      {isLogin ? (
        <LoginForm
          onLogin={handleLogin}
          onSwitchToSignup={() => setIsLogin(false)}
        />
      ) : (
        <SignupForm
          onSignup={handleSignup}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    <Footer />
    </>
  );
};

export default Auth;
