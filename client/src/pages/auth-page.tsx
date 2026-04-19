import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Lock, Mail, User, Eye, EyeOff } from "lucide-react";

// Login schema only requires username and password
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration schema extends the insertUserSchema with password confirmation
const registerSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Use an effect for navigation to avoid React hooks error
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "viewer", // Default role
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Remove confirmPassword before submitting
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <div className="grid w-full gap-8 lg:grid-cols-2">
        {/* Form Section */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl leading-tight">
              Сеть сейсмических наблюдений г. Иркутска
            </h1>
            <p className="text-muted-foreground text-sm">
              Войдите для доступа к системе мониторинга инфраструктурных объектов.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Вход в систему</CardTitle>
                  <CardDescription>
                    Введите учётные данные для доступа к панели мониторинга.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-primary">
                                <User className="ml-2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                  className="border-none focus-visible:ring-0" 
                                  placeholder="Enter your username" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-primary">
                                <Lock className="ml-2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                  className="border-none focus-visible:ring-0" 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="Enter your password" 
                                  {...field} 
                                />
                                <button 
                                  type="button"
                                  className="mr-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                  ) : (
                                    <Eye className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3">
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <p className="font-medium">Debugging Info:</p>
                    <p>Having trouble logging in? View all users and their passwords at:</p>
                    <a 
                      href="/api/debug/users" 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      /api/debug/users
                    </a>
                    <p className="mt-1 text-xs">This endpoint is for debugging only and should be removed in production.</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button 
                      className="text-primary underline-offset-4 hover:underline" 
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Register Tab */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Register for a new account to access the system.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-primary">
                                <User className="ml-2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                  className="border-none focus-visible:ring-0" 
                                  placeholder="Choose a username" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-primary">
                                <Mail className="ml-2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                  className="border-none focus-visible:ring-0" 
                                  type="email" 
                                  placeholder="Enter your email" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create a password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <p className="text-sm text-muted-foreground mt-4">
                    Already have an account?{" "}
                    <button 
                      className="text-primary underline-offset-4 hover:underline" 
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Hero Section with illustration */}
        <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 to-primary/90 p-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDEwIEM1MCA0MCA4MCA4MCA4MCA4MCBTMTAwIDQwIDE1MCAxMCBMMTUwIDAgTDAgMCBMMCAxMCIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIiAvPjxwYXRoIGQ9Ik0wIDMwIEM1MCA2MCA4MCA5MCA4MCA5MCBTMTIwIDYwIDE1MCAzMCBMMTUwIDAgTDAgMCBMMCAzMCIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIgLz48L3N2Zz4=')] opacity-50"></div>
          <div className="z-10 flex flex-col items-center text-center">
            <h2 className="text-xl font-bold leading-snug">Сеть сейсмических наблюдений за объектами гражданской и промышленной инфраструктуры г. Иркутска</h2>
            <p className="mt-4 mb-8 max-w-md text-base text-white/80">
              Автоматизированная система мониторинга сейсмических колебаний инфраструктурных объектов. Онлайн-наблюдение, анализ грунтов, нормативная база СП/СНиП/ГОСТ.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col items-center">
                <div className="mb-2 rounded-full bg-white/10 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-center">Онлайн-мониторинг</h3>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-2 rounded-full bg-white/10 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-center">Объекты инфраструктуры</h3>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-2 rounded-full bg-white/10 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-center">Анализ спектров</h3>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-2 rounded-full bg-white/10 p-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-center">Нормативная база</h3>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-48 left-0 h-96 w-full bg-gradient-to-t from-white/5 to-transparent"></div>
        </div>
      </div>
    </div>
  );
}