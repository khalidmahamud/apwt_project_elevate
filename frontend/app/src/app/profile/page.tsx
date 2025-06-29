'use client';

import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useState, useRef, useEffect } from 'react';
import { Edit, Save, X, Upload, Link as LinkIcon, User, Mail, Camera, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profileImage: ''
  });
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update formData when user data becomes available
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        profileImage: user.profileImage || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (!url.startsWith('http')) {
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${url}`;
    }
    return url;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload file to backend
        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Use the returned URL with proper construction
        const imageUrl = getFullUrl(uploadResponse.data.url);
        setFormData(prev => ({ ...prev, profileImage: imageUrl }));
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Fallback to placeholder URL
        const placeholderUrl = `https://via.placeholder.com/300x300/cccccc/666666?text=${encodeURIComponent(file.name)}`;
        setFormData(prev => ({ ...prev, profileImage: placeholderUrl }));
      }
    }
  };

  const handleImageUrlSubmit = () => {
    if (imageUrl) {
      const fullUrl = getFullUrl(imageUrl);
      setFormData(prev => ({ ...prev, profileImage: fullUrl }));
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update basic user information (excluding profileImage)
      const { profileImage, ...userData } = formData;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (userData.email && !emailRegex.test(userData.email)) {
        throw new Error('Invalid email format');
      }
      
      console.log('Sending user data:', userData);
      await api.patch(`/admin/users/${user.id}`, userData);
      
      // Update profile image separately if it changed
      if (profileImage !== user?.profileImage) {
        console.log('Sending profile image:', { profileImage });
        try {
          await api.patch(`/admin/users/${user.id}/profile-image`, { profileImage });
        } catch (imageError) {
          console.error('Failed to update profile image:', imageError);
          // Continue with the update even if image fails
        }
      }
      
      const profileRes = await api.get('/auth/profile');
      updateUser(profileRes.data);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        profileImage: user.profileImage || ''
      });
    }
    setIsEditing(false);
    setShowImageInput(false);
    setImageUrl('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">User Not Found</h3>
              <p className="text-muted-foreground">Unable to load profile information.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and profile information
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Picture Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={getFullUrl(formData.profileImage) || 'https://github.com/shadcn.png'} />
                  <AvatarFallback className="text-2xl font-semibold">
                    {formData.firstName?.[0]?.toUpperCase()}
                    {formData.lastName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="w-full space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 cursor-pointer"
                      onClick={() => setShowImageInput(!showImageInput)}
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      URL
                    </Button>
                  </div>
                  
                  {showImageInput && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter image URL"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={handleImageUrlSubmit} className="w-full cursor-pointer">
                        Add Image
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>

        {/* Profile Information Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Update your personal details and contact information
                </p>
              </div>
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} className="cursor-pointer">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="min-w-[100px] bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">Profile updated successfully!</span>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-muted/50" : ""}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-muted/50" : ""}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted/50" : ""}
                  placeholder="Enter your email address"
                />
                <p className="text-xs text-muted-foreground">
                  This email is used for account notifications and login
                </p>
              </div>

              {!isEditing && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Account Status</Badge>
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 