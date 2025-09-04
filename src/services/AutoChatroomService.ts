/**
 * Auto Chatroom Service
 * 
 * Automatically creates chatrooms with all divination specialists for new users
 * Uses existing backend APIs without requiring any backend changes
 */

import { APIServices } from '../api/http/v1/APIServices';
import { UserSession } from '../utils/userSession';

export interface AutoChatroomResult {
  success: boolean;
  createdChatrooms: number;
  failedChatrooms: number;
  chatrooms: Array<{
    sub_account_id: string;
    specialist_name: string;
    chatroom_id?: string;
    status: 'created' | 'existing' | 'failed';
    error?: string;
  }>;
  error?: string;
}

export class AutoChatroomService {
  
  /**
   * Auto-initialize chatrooms for a user with all 5 divination specialists
   * 
   * This function ensures EVERY user (new or old) has 5 match records and 5 chatrooms:
   * 1. Gets current available matches (these have corresponding match records)
   * 2. If less than 5, requests additional matches to reach 5 total
   * 3. Creates chatrooms with each candidate (idempotent - won't create duplicates)
   * 4. Handles edge cases where backend may not provide all 5 due to match history
   * 5. Returns summary of chatroom status
   */
  static async initializeDivinationChatrooms(): Promise<AutoChatroomResult> {
    console.log('🔮 [AutoChatroom] Starting divination chatrooms initialization...');
    
    const result: AutoChatroomResult = {
      success: false,
      createdChatrooms: 0,
      failedChatrooms: 0,
      chatrooms: []
    };

    try {
      // STEP 0: Check if user already has chatrooms - if so, skip expensive match requests
      console.log('🔍 [AutoChatroom] Step 0: Checking existing chatrooms first...');
      const existingChatroomsResponse = await APIServices.getChatrooms(20);
      
      if (existingChatroomsResponse.code === 200) {
        const existingChatrooms = (existingChatroomsResponse.data as any)?.chatrooms || [];
        console.log(`🔍 [AutoChatroom] Found ${existingChatrooms.length} existing chatrooms`);
        
        // If user already has 5 chatrooms, no need to proceed
        const EXPECTED_SPECIALISTS_COUNT = 5;
        if (existingChatrooms.length >= EXPECTED_SPECIALISTS_COUNT) {
          console.log(`✅ [AutoChatroom] User already has ${existingChatrooms.length} chatrooms, skipping initialization`);
          
          // Return success status with existing chatrooms
          for (const room of existingChatrooms) {
            result.chatrooms.push({
              sub_account_id: room.sub_account_id,
              specialist_name: room.sub_account_name || 'Specialist',
              chatroom_id: room._id,
              status: 'existing'
            });
          }
          
          result.success = true;
          result.createdChatrooms = existingChatrooms.length;
          
          return result;
        }
      }

      // Step 1: Get current matches first
      console.log('📡 [AutoChatroom] Step 1: Getting current matches...');
      const currentMatchesResponse = await APIServices.getCurrentMatches();
      
      if (currentMatchesResponse.code !== 200) {
        throw new Error(`Failed to get current matches: ${currentMatchesResponse.msg}`);
      }

      let candidates = currentMatchesResponse.data.candidates || [];
      console.log(`📡 [AutoChatroom] Found ${candidates.length} existing match candidates`);
      
      // Step 2: Always ensure user has complete set of 5 divination specialists
      const EXPECTED_SPECIALISTS_COUNT = 5;
      
      if (candidates.length < EXPECTED_SPECIALISTS_COUNT) {
        console.log(`📡 [AutoChatroom] Step 2: User has ${candidates.length}/${EXPECTED_SPECIALISTS_COUNT} specialists, requesting additional matches...`);
        
        // First try free matches
        const metadata = currentMatchesResponse.data.metadata as any;
        const canGetFreeMatch = metadata?.match_summary?.has_initial_matches || 
                               metadata?.match_summary?.can_get_daily_free;
        
        if (canGetFreeMatch) {
          try {
            console.log('🆓 [AutoChatroom] Trying free matches first...');
            const newMatchesResponse = await APIServices.getMatches(false);
            
            if (newMatchesResponse.code === 200) {
              const newCandidates = newMatchesResponse.data.candidates || [];
              console.log(`✅ [AutoChatroom] Got ${newCandidates.length} new free match candidates`);
              
              // Merge new candidates with existing ones, avoiding duplicates
              const existingIds = new Set(candidates.map(c => c.sub_account_id));
              const uniqueNewCandidates = newCandidates.filter(c => !existingIds.has(c.sub_account_id));
              
              candidates = [...candidates, ...uniqueNewCandidates];
              console.log(`✅ [AutoChatroom] Total candidates after free matches: ${candidates.length}`);
            }
          } catch (freeMatchError) {
            console.warn('⚠️ [AutoChatroom] Free matches failed:', freeMatchError);
          }
        }
        
        // If still not enough candidates, try paid matches (this is crucial for completeness)
        if (candidates.length < EXPECTED_SPECIALISTS_COUNT) {
          console.log(`💰 [AutoChatroom] Still need ${EXPECTED_SPECIALISTS_COUNT - candidates.length} more specialists, trying paid matches...`);
          
          // First check user's credits
          try {
            const userSession = UserSession.get();
            if (userSession?.user_id) {
              const creditsResponse = await APIServices.getUserCredits(userSession.user_id);
              const currentCredits = creditsResponse.data?.current_balance || 0;
              console.log(`💰 [AutoChatroom] User has ${currentCredits} credits`);
              
              // If user has insufficient credits, warn but still try (backend might have generous settings)
              if (currentCredits < 50) { // Assume 50 credits needed for safety
                console.warn(`⚠️ [AutoChatroom] User may have insufficient credits (${currentCredits}) for paid matches`);
              }
            }
          } catch (creditError) {
            console.warn('⚠️ [AutoChatroom] Could not check user credits:', creditError);
          }
          
          try {
            const paidMatchesResponse = await APIServices.getMatches(true);
            
            if (paidMatchesResponse.code === 200) {
              const paidCandidates = paidMatchesResponse.data.candidates || [];
              console.log(`✅ [AutoChatroom] Got ${paidCandidates.length} paid match candidates`);
              
              // Merge paid candidates, avoiding duplicates
              const existingIds = new Set(candidates.map(c => c.sub_account_id));
              const uniquePaidCandidates = paidCandidates.filter(c => !existingIds.has(c.sub_account_id));
              
              candidates = [...candidates, ...uniquePaidCandidates];
              console.log(`✅ [AutoChatroom] Total candidates after paid matches: ${candidates.length}`);
            } else if (paidMatchesResponse.code === 409 || paidMatchesResponse.msg?.includes('credits')) {
              console.warn(`💸 [AutoChatroom] Insufficient credits for paid matches: ${paidMatchesResponse.msg}`);
            } else {
              console.warn(`⚠️ [AutoChatroom] Paid matches request failed: ${paidMatchesResponse.msg}`);
            }
          } catch (paidMatchError) {
            console.warn('⚠️ [AutoChatroom] Paid matches failed:', paidMatchError);
          }
        }
        
        // Final check - if still not complete, log warning but continue
        if (candidates.length < EXPECTED_SPECIALISTS_COUNT) {
          console.warn(`⚠️ [AutoChatroom] Could only obtain ${candidates.length}/${EXPECTED_SPECIALISTS_COUNT} specialists through match requests`);
          console.log('🔄 [AutoChatroom] Implementing fallback strategy - checking existing chatrooms...');
          
          // FALLBACK: Check if user has existing chatrooms with missing specialists
          // This handles cases where user has consumed matches but chatrooms still exist
          try {
            const chatroomsResponse = await APIServices.getChatrooms(20);
            if (chatroomsResponse.code === 200) {
              const existingChatrooms = (chatroomsResponse.data as any)?.chatrooms || [];
              console.log(`🔍 [AutoChatroom] Found ${existingChatrooms.length} existing chatrooms`);
              
              // Extract sub_account_ids from existing chatrooms that we don't have as candidates
              const candidateIds = new Set(candidates.map(c => c.sub_account_id));
              const chatroomSubAccountIds = existingChatrooms
                .map((room: any) => room.sub_account_id)
                .filter((id: string) => !candidateIds.has(id));
              
              console.log(`🔍 [AutoChatroom] Found ${chatroomSubAccountIds.length} additional chatroom sub_accounts not in current candidates`);
              
              // For each missing sub_account, create a minimal candidate entry
              // This ensures we can still create/verify chatrooms even without active matches
              for (const subAccountId of chatroomSubAccountIds) {
                const existingChatroom = existingChatrooms.find((room: any) => room.sub_account_id === subAccountId);
                if (existingChatroom) {
                  const fallbackCandidate = {
                    id: subAccountId, // Use sub_account_id as id
                    sub_account_id: subAccountId,
                    display_name: existingChatroom.sub_account_name || `Specialist ${subAccountId}`,
                    // Add all required MatchCandidate fields
                    agent_id: existingChatroom.agent_id || '',
                    name: existingChatroom.sub_account_name || `Specialist ${subAccountId}`,
                    bio: '',
                    age: 25, // Default age
                    location: '',
                    gender: 'other', // Default gender
                    tags: [],
                    photo_urls: [],
                    avatar_url: existingChatroom.avatar_url || null,
                    max_concurrent_chats: 1000, // Default from our setup
                    is_active: true // Assume active since chatroom exists
                  };
                  
                  candidates.push(fallbackCandidate);
                  console.log(`✅ [AutoChatroom] Added fallback candidate: ${fallbackCandidate.display_name}`);
                }
              }
            }
          } catch (fallbackError) {
            console.warn('⚠️ [AutoChatroom] Fallback strategy failed:', fallbackError);
          }
        }
        
        // After fallback, check final count
        if (candidates.length < EXPECTED_SPECIALISTS_COUNT) {
          console.warn(`⚠️ [AutoChatroom] Still missing ${EXPECTED_SPECIALISTS_COUNT - candidates.length} specialists after fallback strategy`);
        } else {
          console.log(`✅ [AutoChatroom] Successfully ensured ${candidates.length} specialists (including fallback if needed)`);
        }
        
      } else {
        console.log(`✅ [AutoChatroom] User already has ${candidates.length} specialists`);
      }

      // Step 3: Create chatrooms with each specialist (regardless of whether matches existed)
      console.log('🏗️ [AutoChatroom] Step 3: Creating chatrooms with specialists...');
      
      const userSession = UserSession.get();
      const userId = userSession?.user_id;
      if (!userId) {
        throw new Error('User ID not found in session');
      }

      for (const candidate of candidates) {
        const chatroomInfo = {
          sub_account_id: candidate.sub_account_id,
          specialist_name: candidate.display_name || candidate.sub_account_id,
          status: 'failed' as 'created' | 'existing' | 'failed',
          error: undefined as string | undefined,
          chatroom_id: undefined as string | undefined
        };

        try {
          console.log(`🏗️ [AutoChatroom] Creating chatroom with ${chatroomInfo.specialist_name}...`);
          
          // Create chatroom using the existing API (idempotent - backend will handle duplicates)
          const createResponse = await APIServices.createChatroom({
            user_id: userId,
            sub_account_id: candidate.sub_account_id
          });

          if (createResponse.code === 200) {
            chatroomInfo.chatroom_id = createResponse.data._id;
            chatroomInfo.status = 'created';
            result.createdChatrooms++;
            
            console.log(`✅ [AutoChatroom] Successfully created chatroom with ${chatroomInfo.specialist_name}`);
          } else {
            // Check for various "already exists" scenarios
            const isAlreadyExists = createResponse.code === 409 || 
                                   (createResponse.msg && (
                                     createResponse.msg.includes('already exists') ||
                                     createResponse.msg.includes('exists') ||
                                     createResponse.msg.includes('duplicate')
                                   ));
                                   
            if (isAlreadyExists) {
              // Chatroom already exists - this is fine
              chatroomInfo.status = 'existing';
              result.createdChatrooms++; // Count as successful
              
              console.log(`ℹ️ [AutoChatroom] Chatroom already exists with ${chatroomInfo.specialist_name}`);
            } else {
              chatroomInfo.error = createResponse.msg || 'Unknown error';
              result.failedChatrooms++;
              
              console.error(`❌ [AutoChatroom] Failed to create chatroom with ${chatroomInfo.specialist_name}: ${chatroomInfo.error}`);
            }
          }
          
        } catch (error) {
          chatroomInfo.error = error instanceof Error ? error.message : String(error);
          result.failedChatrooms++;
          
          console.error(`❌ [AutoChatroom] Exception creating chatroom with ${chatroomInfo.specialist_name}:`, error);
        }

        result.chatrooms.push(chatroomInfo);
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Step 4: Determine overall success
      result.success = result.createdChatrooms > 0;
      
      console.log(`🎉 [AutoChatroom] Initialization complete:`, {
        success: result.success,
        created: result.createdChatrooms,
        failed: result.failedChatrooms,
        total: candidates.length
      });

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [AutoChatroom] Auto-initialization failed:', errorMessage);
      
      result.success = false;
      result.error = errorMessage;
      
      return result;
    }
  }

  /**
   * Check if user already has chatrooms with divination specialists
   * This can be used to determine if auto-initialization is needed
   */
  static async checkExistingChatrooms(): Promise<boolean> {
    try {
      console.log('🔍 [AutoChatroom] Checking for existing chatrooms...');
      
      const chatroomsResponse = await APIServices.getChatrooms(20);
      
      if (chatroomsResponse.code !== 200) {
        console.warn('⚠️ [AutoChatroom] Failed to check existing chatrooms');
        return false;
      }
      
      const existingChatrooms = (chatroomsResponse.data as any)?.chatrooms || [];
      const hasChatrooms = existingChatrooms.length > 0;
      
      console.log(`🔍 [AutoChatroom] Found ${existingChatrooms.length} existing chatrooms`);
      
      return hasChatrooms;
      
    } catch (error) {
      console.error('❌ [AutoChatroom] Error checking existing chatrooms:', error);
      return false;
    }
  }
}