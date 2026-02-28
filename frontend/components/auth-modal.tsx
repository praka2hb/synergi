"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Mail, Chrome, Loader2, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

// Form schemas
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

const otpSchema = z.object({
  otp: z.string().min(6, "Please enter the 6-digit code"),
})

type EmailData = z.infer<typeof emailSchema>
type OTPData = z.infer<typeof otpSchema>

type AuthStep = "email" | "otp"

interface AuthModalProps {
  children: React.ReactNode
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

export function AuthModal({ children, onOpenChange, open: externalOpen }: AuthModalProps) {
  const { login } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<AuthStep>("email")
  const [isLoading, setIsLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState("")

  // Handle external open prop
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen)
    }
  }, [externalOpen])

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })

  const otpForm = useForm<OTPData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  const handleEmailSubmit = async (data: EmailData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/initiate_signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setCurrentEmail(data.email)
        setStep("otp")
        toast.success("OTP sent to your email!")
      } else {
        toast.error(result.message || "Failed to send OTP")
      }
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPVerification = async (data: OTPData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, otp: data.otp }),
      })

      const result = await response.json()

      if (response.ok && result.token) {
        login(result.token)
        toast.success("Successfully authenticated!")
        setOpen(false)
        resetForms()
      } else {
        toast.error(result.message || "Invalid OTP")
      }
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForms = () => {
    setStep("email")
    setCurrentEmail("")
    emailForm.reset()
    otpForm.reset()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    if (!newOpen) {
      resetForms()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogPortal>
        {/* Custom overlay with matte dark grey in dark theme */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 dark:bg-neutral-900/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 grid w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-6 bg-background/98 dark:bg-neutral-800/95 backdrop-blur-md border border-border/60 dark:border-neutral-700/80 p-6 shadow-2xl rounded-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
          {/* Close button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-center text-xl font-semibold">
            {step === "email" ? "Welcome to Synergi" : "Verify Your Email"}
          </DialogTitle>
          {step === "email" && (
            <p className="text-center text-sm text-muted-foreground">
              Enter your email to sign in or create an account
            </p>
          )}
        </DialogHeader>

        <div className="px-1">
          {/* Email Form */}
          {step === "email" && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-5">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          className="h-11 bg-background border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 dark:border-gray-600 dark:focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Continue with Email
                </Button>
              </form>
            </Form>
          )}

          {/* OTP Verification */}
          {step === "otp" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to
                </p>
                <p className="font-medium text-foreground bg-accent/30 px-3 py-1 rounded-md inline-block">
                  {currentEmail}
                </p>
              </div>

              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(handleOTPVerification)} className="space-y-6">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">OTP Code</FormLabel>
                        <FormControl>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup className="gap-2">
                                <InputOTPSlot index={0} className="w-12 h-12 text-lg font-semibold border-2 border-gray-300 focus:border-primary dark:border-gray-600 dark:focus:border-primary" />
                                <InputOTPSlot index={1} className="w-12 h-12 text-lg font-semibold border-2 border-gray-300 focus:border-primary dark:border-gray-600 dark:focus:border-primary" />
                                <InputOTPSlot index={2} className="w-12 h-12 text-lg font-semibold border-2 border-gray-300 focus:border-primary dark:border-gray-600 dark:focus:border-primary" />
                                <InputOTPSlot index={3} className="w-12 h-12 text-lg font-semibold border-2 border-gray-300 focus:border-primary dark:border-gray-600 dark:focus:border-primary" />
                                <InputOTPSlot index={4} className="w-12 h-12 text-lg font-semibold border-2 border-gray-300 focus:border-primary dark:border-gray-600 dark:focus:border-primary" />
                                <InputOTPSlot index={5} className="w-12 h-12 text-lg font-semibold border-2 border-gray-300 focus:border-primary dark:border-gray-600 dark:focus:border-primary" />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 font-medium" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Verify Code
                  </Button>
                </form>
              </Form>

              <Button
                variant="ghost"
                className="w-full h-10 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                onClick={() => setStep("email")}
                disabled={isLoading}
              >
                ← Back to email
              </Button>
            </div>
          )}


        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
