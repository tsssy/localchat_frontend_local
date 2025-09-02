/**
 * API Data Transformers
 * Transforms backend API responses into frontend-compatible data structures
 * Handles missing fields with default "NEED TO IMPLEMENT" values
 */

import type { 
  ChatroomData, 
  ChatroomParticipantsData, 
  MatchCandidate,
  UserCreditsData,
  MessageCardData,
  GetMatchInformationResponse
} from '../api/http/v1/APISchemes';

/**
 * Transform chatroom + participants data into MessageCardData format
 */
export function transformChatroomToMessageCard(
  chatroom: ChatroomData,
  participants: ChatroomParticipantsData
): MessageCardData {
  return {
    chatroom_id: chatroom.id,
    target_user_id: participants.agent.id, // Keep as string (MongoDB ObjectId)
    target_user_name: participants.agent.display_name,
    target_user_photo_url: participants.agent.avatar_url || "NEED TO IMPLEMENT",
    last_message: "NEED TO IMPLEMENT", // Backend needs to provide this
    last_message_timestamp: "NEED TO IMPLEMENT", // Backend needs to provide this
    unread_count: 404, // Backend needs to provide this
    is_online: false // Backend needs to provide this
  };
}

/**
 * Transform match candidate + credits data into GetMatchInformationResponse format
 */
export function transformMatchCandidateToMatchInfo(
  candidate: MatchCandidate,
  credits: UserCreditsData
): GetMatchInformationResponse {
  return {
    code: 200,
    msg: "Success",
    data: {
      number_of_match_requests: credits.free_matches_used,
      target_user: {
        id: parseInt(candidate.agent_id),
        name: candidate.display_name,
        age: 404, // Default age - backend needs to provide this
        location: "NEED TO IMPLEMENT", // Backend needs to provide this
        photos: candidate.avatar_url ? [candidate.avatar_url] : ["NEED TO IMPLEMENT"], // Backend needs to provide multiple photos
        tags: ["NEED TO IMPLEMENT"], // Backend needs to provide this
        bio: candidate.bio || "NEED TO IMPLEMENT"
      }
    }
  };
}

/**
 * Fix product field naming inconsistencies
 * Frontend expects product_* prefixed fields, but API returns without prefix
 */
export function transformProduct(product: any): any {
  return {
    ...product,
    // Add product_ prefixed versions for frontend compatibility
    product_id: product.id,
    product_title: product.title,
    product_description: product.description,
    product_price: product.price,
    product_currency: product.currency,
    product_credits: product.credits,
    product_category: product.category,
    product_photo_url: product.photo_url,
    product_is_active: product.is_active,
    
    // Keep original fields as well for flexibility
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    currency: product.currency,
    credits: product.credits,
    category: product.category,
    photo_url: product.photo_url,
    is_active: product.is_active
  };
}

/**
 * Add cost_per_message to credits data with default value
 */
export function transformCreditsData(credits: UserCreditsData): UserCreditsData & { cost_per_message: number } {
  return {
    ...credits,
    cost_per_message: 404 // Default cost - backend needs to provide this
  };
}