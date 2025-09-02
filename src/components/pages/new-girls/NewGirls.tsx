import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { APIServices } from '@/api/http/v1/APIServices';
import { UserSession } from '@/utils/userSession';
import type { MatchCandidate } from '@/api/http/v1/APISchemes';


interface NewGirlsProps {
  userSession: {
    userId: string; // Changed from number to string
    userLocation: string;
    meta?: Record<string, any>; // Add meta for cache access
  } | null;
  onChatNow: (girl: { 
    id: string; // Changed from number to string
    name: string; 
    photo: string; 
    photos?: string[]; 
    isOnline: boolean; 
    age?: number; 
    location?: string; 
    tags?: string[]; 
    bio?: string; 
  }) => void;
  onClearCache?: (cacheTypes: string[]) => void; // Add cache clearing callback
  onUpdateCache?: (cacheType: string, cacheData: any) => void; // Add cache update callback
  onNavigateToShop?: () => void; // Add navigation to shop for insufficient funds
}

export function NewGirls({ userSession, onChatNow, onClearCache, onUpdateCache, onNavigateToShop }: NewGirlsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<MatchCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAnotherMatch, setIsLoadingAnotherMatch] = useState(false);
  const [isInitializingChatroom, setIsInitializingChatroom] = useState(false);
  const [matchMetadata, setMatchMetadata] = useState<any>(null); // Store API metadata for button logic
  const [costPerMatch, setCostPerMatch] = useState<number>(2500); // Default cost per match
  const [isLoadingCostPerMatch, setIsLoadingCostPerMatch] = useState(false); // Loading state for cost per match

  useEffect(() => {
    // Track page visit when component mounts
    const trackPageVisit = async () => {
      try {
        await APIServices.updateLastVisited({ page: 'new_match' });
        console.log('✅ [NewGirls] Page visit tracked: new_match');
      } catch (error) {
        console.warn('⚠️ [NewGirls] Failed to track page visit:', error);
      }
    };

    trackPageVisit();

    // Load cost_per_match from API (FRESH CALL) with fallback to hardcoded default (NON-BLOCKING)
    const loadCostPerMatch = async () => {
      console.log('📡 [NewGirls] Loading cost per match...');
      setIsLoadingCostPerMatch(true);
      
      try {
        // CACHE-FIRST APPROACH: Check if SettingsCache is available
        const settingsCache = userSession?.meta?.SettingsCache;
        if (settingsCache && settingsCache.settings) {
          console.log('📦 [NewGirls] Using SettingsCache from meta:', settingsCache);
          
          const response = settingsCache.settings;
          if (response.code === 200 && response.data?.cost_per_match) {
            const apiCostPerMatch = response.data.cost_per_match;
            setCostPerMatch(apiCostPerMatch);
            console.log('✅ [NewGirls] Cost per match from Settings Cache:', apiCostPerMatch);
            setIsLoadingCostPerMatch(false);
            return;
          }
        }

        // FALLBACK: Make fresh API call
        console.log('📡 [NewGirls] No settings cache available, making fresh API call');
        const response = await APIServices.getUserSettings();
        
        if (response.code === 200 && response.data?.cost_per_match) {
          const apiCostPerMatch = response.data.cost_per_match;
          setCostPerMatch(apiCostPerMatch);
          console.log('✅ [NewGirls] Cost per match from User Settings API:', apiCostPerMatch);
          
          // Update cache after successful API call
          if (onUpdateCache) {
            const updatedSettingsCache = {
              settings: response,
              cachedAt: new Date().toISOString()
            };
            onUpdateCache('SettingsCache', updatedSettingsCache);
            console.log('📦 [NewGirls] Settings cache updated after fresh API call');
          }
        } else {
          throw new Error(response.msg || 'Invalid user settings response');
        }
      } catch (error) {
        console.error('❌ [NewGirls] User Settings API failed, using hardcoded default:', error);
        
        // SIMPLIFIED: Only hardcoded fallback (no cache)
        console.log('⚠️ [NewGirls] FALLBACK: Using default cost per match: 2500');
        // costPerMatch remains 2500 from initial state
      } finally {
        setIsLoadingCostPerMatch(false);
      }
    };

    // Load cost per match (non-blocking - runs in background)
    loadCostPerMatch();

    const loadMatches = async () => {
      if (!userSession) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get user_id from UserSession
        const sessionData = UserSession.get();
        if (!sessionData) {
          throw new Error('User session not found');
        }

        // CACHE-FIRST APPROACH: Check if MatchingCache is available
        const matchingCache = userSession.meta?.MatchingCache;
        if (matchingCache && matchingCache.userId === sessionData.user_id) {
          console.log('📦 [NewGirls] Using cached matching data:');
          console.log('📦 [NewGirls] Cache timestamp:', matchingCache.cachedAt);
          console.log('📦 [NewGirls] Cache userId:', matchingCache.userId);
          console.log('📦 [NewGirls] Cache candidates count:', matchingCache.currentMatches?.data?.candidates?.length || 0);
          if (matchingCache.currentMatches?.data?.candidates?.length > 0) {
            console.log('📦 [NewGirls] First cached candidate:', matchingCache.currentMatches.data.candidates[0].display_name, '(sub_account_id:', matchingCache.currentMatches.data.candidates[0].sub_account_id + ')');
          }
          
          // Use cached getCurrentMatches response first
          let response = matchingCache.currentMatches;
          setMatchMetadata(response.data?.metadata || null);
          
          if (response.code === 200 && response.data.candidates.length > 0) {
            // Found unused candidates in cache
            console.log('✅ [NewGirls] Found unused candidates in cache');
            
            setCurrentMatch(response.data.candidates[0]);
            setCurrentImageIndex(0);
            console.log(`[NewGirls] Loaded cached candidate: ${response.data.candidates[0].display_name} (sub_account_id: ${response.data.candidates[0].sub_account_id})`);
          } else {
            // No candidates in cache, check if we can get free matches based on current metadata
            const canGetFreeMatch = response.data.metadata?.match_summary?.has_initial_matches || 
                                   response.data.metadata?.match_summary?.can_get_daily_free;
            
            if (canGetFreeMatch) {
              console.log('✅ [NewGirls] Can get free match based on cached metadata, making API calls');
              try {
                // Call POST to get free match
                await APIServices.getMatches(false);
                
                // Always call GET after POST to get fresh data
                console.log('✅ [NewGirls] Got free match from cache flow, getting current matches');
                const updatedCurrentMatches = await APIServices.getCurrentMatches();
                
                // ALWAYS update cache after GET call (unconditional)
                if (updatedCurrentMatches.code === 200) {
                  console.log('✅ [NewGirls] GET call successful, updating cache');
                  const updatedCache = {
                    currentMatches: updatedCurrentMatches,
                    cachedAt: new Date().toISOString(),
                    userId: matchingCache.userId
                  };
                  onUpdateCache('MatchingCache', updatedCache);
                  console.log('📦 [NewGirls] Cache updated after successful GET call');
                }
                
                if (updatedCurrentMatches.code === 200 && updatedCurrentMatches.data.candidates.length > 0) {
                  setCurrentMatch(updatedCurrentMatches.data.candidates[0]);
                  setCurrentImageIndex(0);
                  setMatchMetadata(updatedCurrentMatches.data?.metadata || null);
                  console.log(`[NewGirls] Loaded free match from cache flow: ${updatedCurrentMatches.data.candidates[0].display_name}`);
                } else {
                  console.log('❌ [NewGirls] No candidates after getting free match from cache flow');
                  setError('No match candidates available after update');
                }
              } catch (error) {
                console.error('❌ [NewGirls] Error in cache free match flow:', error);
                setError('Failed to load updated match data');
              }
            } else {
              console.log('❌ [NewGirls] No matches available from cache and no free matches available');
              setError('No matches available. Please try again later.');
            }
          }
          
          // Exit early when using cache
          setIsLoading(false);
          return;
        }

        // FALLBACK: If no cache available, make API calls as before
        console.log('📡 [NewGirls] No cache available, making fresh API calls');
        console.log('📡 Checking for current matches and lastMatch');
        let response = await APIServices.getCurrentMatches(); // GET method
        
        setMatchMetadata(response.data?.metadata || null); // Store metadata for button logic
        
        // ALWAYS update cache after GET call (unconditional) - only if code 200
        if (response.code === 200) {
          console.log('✅ [NewGirls] Initial GET call successful, updating cache');
          let newMatchingCache = {
            currentMatches: response,
            cachedAt: new Date().toISOString(),
            userId: sessionData.user_id
          };
          onUpdateCache('MatchingCache', newMatchingCache);
          console.log('📦 [NewGirls] Cache updated after initial GET call');
        }
        
        if (response.code === 200 && response.data.candidates.length > 0) {
          // Found unused candidates
          console.log('✅ Found unused candidates');
          
          setCurrentMatch(response.data.candidates[0]);
          setCurrentImageIndex(0);
          console.log(`Loaded candidate: ${response.data.candidates[0].display_name}`);
        } else {
          // No unused candidates, check metadata for free matches
          console.log('📡 No unused candidates, checking metadata for free matches');
          
          const canGetFreeMatch = response.data.metadata?.match_summary?.has_initial_matches || 
                                 response.data.metadata?.match_summary?.can_get_daily_free;
          
          if (canGetFreeMatch) {
            console.log('✅ Can get free match based on metadata, calling getMatches(false)');
            // Call POST to get free match
            await APIServices.getMatches(false);
            
            // Always call GET after POST to get fresh data
            console.log('✅ Got free match, calling getCurrentMatches again');
            const updatedCurrentMatches = await APIServices.getCurrentMatches();
            
            // ALWAYS update cache after GET call (unconditional) - only if code 200
            if (updatedCurrentMatches.code === 200) {
              console.log('✅ [NewGirls] Second GET call successful, updating cache');
              const updatedCache = {
                currentMatches: updatedCurrentMatches,
                cachedAt: new Date().toISOString(),
                userId: sessionData.user_id
              };
              onUpdateCache('MatchingCache', updatedCache);
              console.log('📦 [NewGirls] Cache updated after second GET call');
            }
            
            if (updatedCurrentMatches.code === 200 && updatedCurrentMatches.data.candidates.length > 0) {
              setCurrentMatch(updatedCurrentMatches.data.candidates[0]);
              setCurrentImageIndex(0);
              setMatchMetadata(updatedCurrentMatches.data?.metadata || null);
              console.log(`Loaded free match candidate: ${updatedCurrentMatches.data.candidates[0].display_name}`);
            } else {
              console.log('❌ No candidates after getting free match');
              setError('No match candidates available after update');
            }
          } else {
            console.log('❌ No free matches available based on metadata');
            setError('No matches available. Please try again later.');
          }
        }
      } catch (error) {
        console.error('Failed to load matches:', error);
        setError(error instanceof Error ? error.message : 'Failed to load matches');
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [userSession]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-pink-400 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading matches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentMatch) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg mb-2">No Matches Found</h3>
            <p className="text-slate-400 text-sm">{error || 'No matches available'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const handlePrevImage = () => {
    if (!currentMatch) return;
    const photos = getPhotosArray(currentMatch);
    setCurrentImageIndex(prev => 
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };
  
  const handleNextImage = () => {
    if (!currentMatch) return;
    const photos = getPhotosArray(currentMatch);
    setCurrentImageIndex(prev => 
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };

  // Helper function to get display location with fallback to user location
  const getDisplayLocation = (matchLocation: string | undefined | null): string => {
    // Use match location if available
    if (matchLocation && matchLocation.trim() !== '') {
      return matchLocation;
    }
    
    // Fallback to authenticated user's location
    const userLocation = UserSession.getUserLocation();
    if (userLocation && userLocation.trim() !== '') {
      return userLocation;
    }
    
    return "Unknown";
  };

  // Helper function to get photos array
  const getPhotosArray = (match: MatchCandidate): string[] => {
    // Use photo_urls from new API, fallback to avatar_url, then default
    let photos: string[] = [];
    
    if (match.photo_urls && match.photo_urls.length > 0) {
      photos = match.photo_urls;
      console.log(`🖼️ [getPhotosArray] Using photo_urls for ${match.display_name}:`, photos.length, 'photos');
    } else if (match.avatar_url) {
      photos = [match.avatar_url];
      console.log(`🖼️ [getPhotosArray] Using avatar_url for ${match.display_name}:`, photos);
    } else {
      photos = ["https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=600&fit=crop&crop=face"];
      console.log(`🖼️ [getPhotosArray] Using default photo for ${match.display_name}`);
    }
    
    return photos;
  };

  const handleChatNow = async () => {
    if (!userSession || !currentMatch) {
      console.error('Missing userSession or currentMatch for chatroom');
      return;
    }

    try {
      setIsInitializingChatroom(true);
      
      // Get user_id from UserSession
      const sessionData = UserSession.get();
      if (!sessionData) {
        throw new Error('User session not found');
      }

      // Step 1: Create/get chatroom using the new createChatroom API
      console.log('📡 [NewGirls] Creating/getting chatroom...');
      const chatroomResponse = await APIServices.createChatroom({
        user_id: sessionData.user_id,
        sub_account_id: currentMatch.sub_account_id
      });

      if (chatroomResponse.code === 200) {
        console.log('✅ [NewGirls] Chatroom created/retrieved successfully');
        console.log('🔍 [NewGirls] Chatroom details:', chatroomResponse.data);
        
        // Step 2: Navigate to chat using only the chatroom_id
        if (!chatroomResponse.data || !chatroomResponse.data.id) {
          throw new Error('Invalid chatroom response: missing chatroom ID');
        }
        
        const chatroomId = chatroomResponse.data.id;
        console.log('🚀 [NewGirls] Navigating to chat with chatroom_id:', chatroomId);
        
        // Call parent with chatroom_id instead of girl info
        onChatNow({
          id: chatroomId, // This is now the chatroom_id, not sub_account_id
          name: currentMatch.display_name, // Keep for backward compatibility
          photo: getPhotosArray(currentMatch)[0], // Keep for backward compatibility
          photos: getPhotosArray(currentMatch), // Keep for backward compatibility
          isOnline: true,
          age: currentMatch.age || 25,
          location: getDisplayLocation(currentMatch.location),
          tags: currentMatch.tags || [],
          bio: currentMatch.bio || "Bio Unknown",
          // Add flag to indicate this is chatroom-based navigation
          _isChatroomNavigation: true,
          _chatroomId: chatroomId
        });
      } else {
        throw new Error(chatroomResponse.msg || 'Failed to create chatroom');
      }

    } catch (error) {
      console.error('❌ [NewGirls] Failed to create chatroom:', error);
      alert(error instanceof Error ? error.message : 'Failed to start chat. Please try again.');
    } finally {
      setIsInitializingChatroom(false);
    }
  };

  // Reusable error handler for API errors (same pattern as ChatScreen)
  const handleAPIError = (error: any, context: string) => {
    console.error(`❌ [NewGirls] ${context} failed:`, error);
    
    if (error?.response?.status === 409 || error?.code === 409) {
      // Code 409: Insufficient funds
      console.log('💰 [NewGirls] Insufficient funds detected for match request');
      
      // Navigate to shop and show toast (same pattern as ChatScreen)
      setTimeout(() => {
        if (onNavigateToShop) {
          onNavigateToShop();
          
          // Show toast notification after navigation
          setTimeout(() => {
            toast.error('Insufficient Funds', {
              description: 'Insufficient fund, please top up to get new matches.',
              duration: 4000,
            });
          }, 100); // Small delay to ensure shop page is rendered
        }
      }, 200);
      
    } else if (error?.response?.status === 404 || error?.code === 404) {
      // Code 404: Network issue
      console.log('🌐 [NewGirls] Network issue detected for match request');
      
      toast.error('Network Issue', {
        description: 'Network Issue, Your credits is not deducted.',
        duration: 4000,
      });
      
    } else {
      // Other errors - generic handling
      const errorMessage = error instanceof Error ? error.message : 'Failed to get another match. Please try again.';
      alert(errorMessage);
    }
  };

  const handleGetAnotherMatch = async () => {
    if (!userSession || !currentMatch) {
      console.error('Missing userSession or currentMatch for getAnotherMatch');
      return;
    }

    // IMMEDIATE CACHE INVALIDATION: Clear cache right after button click, before any async operations
    console.log('🗑️ [NewGirls] IMMEDIATELY clearing MatchingCache and ChatroomsCache after button click');
    if (onClearCache) {
      onClearCache(['MatchingCache', 'ChatroomsCache']);
      console.log('✅ [NewGirls] Cache cleared immediately via parent callback');
    } else {
      console.warn('⚠️ [NewGirls] No onClearCache callback provided - cache not cleared');
    }

    try {
      setIsLoadingAnotherMatch(true);

      // Get user_id from UserSession
      const sessionData = UserSession.get();
      if (!sessionData) {
        throw new Error('User session not found');
      }

      // Step 1: Create/get chatroom for current match first
      console.log('📡 Step 1: Creating/getting chatroom for current match...');
      const chatroomResponse = await APIServices.createChatroom({
        user_id: sessionData.user_id,
        sub_account_id: currentMatch.sub_account_id
      });

      if (chatroomResponse.code === 200) {
        console.log('✅ Step 1 successful: Chatroom created/retrieved');
        console.log('🔍 Chatroom details:', chatroomResponse.data);
      } else {
        console.warn('⚠️ Step 1 warning: Chatroom creation failed but continuing with match request');
        console.warn('Chatroom response:', chatroomResponse.msg);
      }

      // Get another match - use metadata to determine paid vs free
      const shouldUsePaidMatch = matchMetadata && 
        !(matchMetadata.match_summary?.has_initial_matches || matchMetadata.match_summary?.can_get_daily_free);
      
      console.log(`📡 Step 2: Getting another match...`);
      console.log(`Metadata:`, matchMetadata);
      console.log(`use_paid_match: ${shouldUsePaidMatch}`);

      console.log(`📡 Calling /api/v1/matching/matches API with use_paid_match=${shouldUsePaidMatch}`);
      const postResponse = await APIServices.getMatches(shouldUsePaidMatch);

      // Always call getCurrentMatches after POST to get fresh data
      console.log('📡 Getting current matches after POST...');
      const getCurrentResponse = await APIServices.getCurrentMatches();

      // ALWAYS update cache after GET call (unconditional) - only if code 200
      if (getCurrentResponse.code === 200) {
        console.log('✅ [NewGirls] GET call in handleGetAnotherMatch successful, updating cache');
        const sessionData = UserSession.get();
        const updatedCache = {
          currentMatches: getCurrentResponse,
          cachedAt: new Date().toISOString(),
          userId: sessionData?.user_id || 'unknown'
        };
        onUpdateCache('MatchingCache', updatedCache);
        console.log('📦 [NewGirls] Cache updated after GET call in handleGetAnotherMatch');
      }

      if (getCurrentResponse.code === 200 && getCurrentResponse.data.candidates.length > 0) {
        // Use GET response for display
        console.log(`✅ Got updated match data from API:`);
        console.log(`✅ Fresh candidate: ${getCurrentResponse.data.candidates[0].display_name} (sub_account_id: ${getCurrentResponse.data.candidates[0].sub_account_id})`);
        console.log(`✅ Fresh candidates count: ${getCurrentResponse.data.candidates.length}`);
        console.log(`✅ Setting currentMatch to fresh candidate...`);
        
        const newMatch = getCurrentResponse.data.candidates[0];
        const newPhotos = getPhotosArray(newMatch);
        
        console.log(`🖼️ [NewGirls] OLD match photos:`, currentMatch ? getPhotosArray(currentMatch) : 'none');
        console.log(`🖼️ [NewGirls] NEW match photos:`, newPhotos);
        console.log(`🖼️ [NewGirls] Current image index before reset:`, currentImageIndex);
        
        // Reset image index FIRST, then set new match
        setCurrentImageIndex(0);
        setCurrentMatch(newMatch);
        setMatchMetadata(getCurrentResponse.data?.metadata || null);
        
        console.log(`🖼️ [NewGirls] Image index reset to 0 for new match`);
        console.log(`✅ State updated with fresh candidate: ${newMatch.display_name}`);
        console.log(`Credits consumed: ${postResponse.data?.credits_consumed || 'unknown'}`);
        console.log(`Remaining credits: ${postResponse.data?.remaining_credits || 'unknown'}`);
        console.log(`Updated metadata:`, getCurrentResponse.data.metadata);
      } else {
        throw new Error('No match candidates available after update');
      }

    } catch (error) {
      handleAPIError(error, 'Get another match');
    } finally {
      setIsLoadingAnotherMatch(false);
    }
  };

  return (
    <div className="flex flex-col h-full">


      {/* Girl Photo Gallery */}
      <div className="flex-1 relative">
        <ImageWithFallback
          key={`${currentMatch.sub_account_id}-${currentImageIndex}`} // Force re-render when match changes
          src={(() => {
            const photos = getPhotosArray(currentMatch);
            const selectedPhoto = photos[currentImageIndex];
            console.log(`🖼️ [Render] Match: ${currentMatch.display_name} (${currentMatch.sub_account_id})`);
            console.log(`🖼️ [Render] Displaying photo ${currentImageIndex + 1}/${photos.length}: ${selectedPhoto}`);
            console.log(`🖼️ [Render] ImageWithFallback key: ${currentMatch.sub_account_id}-${currentImageIndex}`);
            return selectedPhoto;
          })()}
          alt={`${currentMatch.display_name} - Photo ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Image Navigation */}
        {getPhotosArray(currentMatch).length > 1 && (
          <>
            {/* Previous Image Button */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all duration-200"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            {/* Next Image Button */}
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all duration-200"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Image Dots Indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {getPhotosArray(currentMatch).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white' 
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Girl Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-24 text-white">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl">{currentMatch.display_name}</h2>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-sm text-green-400">online</span>
          </div>
          
          {/* Basic Info Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-base px-3 py-1">
              {currentMatch.age ? `Age ${currentMatch.age}` : "Age Unknown"}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-base px-3 py-1">
              {getDisplayLocation(currentMatch.location)}
            </Badge>
          </div>

          {/* Interest Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {currentMatch.tags && currentMatch.tags.length > 0 ? (
              currentMatch.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="bg-white/10 text-white border-white/30 text-base px-3 py-1">
                  {tag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-base px-3 py-1">
                No interests listed
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleChatNow}
              disabled={isInitializingChatroom}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializingChatroom ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Initializing Chatroom...
                </div>
              ) : (
                'Chat Now'
              )}
            </Button>
            <Button 
              onClick={handleGetAnotherMatch}
              disabled={isLoadingAnotherMatch}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-full py-5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingAnotherMatch ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Finding Match...
                </div>
              ) : (
                (() => {
                  const shouldShowPaidMatch = matchMetadata && 
                    !(matchMetadata.match_summary?.has_initial_matches || matchMetadata.match_summary?.can_get_daily_free);
                  
                  return shouldShowPaidMatch
                    ? (isLoadingCostPerMatch 
                        ? 'Get Another Match (Loading...)' 
                        : `Get Another Match (${costPerMatch} coins)`)
                    : 'Get Another Match';
                })()
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}