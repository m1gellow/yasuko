// supabase/functions/telegram-auth/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@^2.49.4";
import * as djwt from "https://deno.land/x/djwt@v2.9.1/mod.ts";
// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const environment = Deno.env.get("ENVIRONMENT") || "production";
const PROJECT_JWT_SECRET = Deno.env.get("PROJECT_JWT_SECRET") || ""; // Используем новое имя
console.log("--- Function telegram-auth Initializing (Standard Supabase JWT Strategy) ---");
console.log("Using supabase-js via jsr.");
console.log("Environment:", environment);
console.log("Supabase URL:", supabaseUrl ? "OK" : "MISSING!");
console.log("Supabase Service Key:", supabaseServiceKey ? "OK" : "MISSING!");
console.log("Telegram Bot Token:", botToken ? "OK" : "MISSING!");
console.log("PROJECT_JWT_SECRET:", PROJECT_JWT_SECRET ? "OK (set)" : "MISSING!");
if (!supabaseUrl || !supabaseServiceKey || !botToken || !PROJECT_JWT_SECRET) {
  const missingVars = [
    !supabaseUrl ? "SUPABASE_URL" : null,
    !supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    !botToken ? "TELEGRAM_BOT_TOKEN" : null,
    !PROJECT_JWT_SECRET ? "PROJECT_JWT_SECRET" : null
  ].filter(Boolean).join(", ");
  console.error(`CRITICAL ERROR: Missing environment variable(s): ${missingVars}.`);
// В реальном приложении здесь можно было бы вернуть стандартную ошибку 500 на любой запрос
}
// Этот клиент будет использоваться в основном для запросов к public таблицам
// и для его свойства .auth.admin.fetch (если оно содержит service_role_key)
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": environment === "development" ? "*" : "https://yasukapersbot.netlify.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info"
};
// --- Telegram InitData Validation ---
async function validateInitData(initDataString) {
  console.log("validateInitData: Starting validation.");
  if (!botToken) {
    console.error("validateInitData: CRITICAL - TELEGRAM_BOT_TOKEN is not set.");
    return false;
  }
  if (!initDataString || initDataString.length === 0) {
    return false;
  }
  const devBypassFlags = [
    "mock_init_data",
    "development_mode",
    "query_id=development_mode"
  ];
  if (environment === "development" && devBypassFlags.some((flag)=>initDataString.includes(flag))) {
    return true;
  }
  try {
    const params = new URLSearchParams(initDataString);
    const hashFromTelegram = params.get("hash");
    if (!hashFromTelegram) {
      console.error("validateInitData: No 'hash' parameter.");
      return false;
    }
    params.delete("hash");
    const dataCheckArray = [];
    for (const [key, value] of Array.from(params.entries()).sort(([aKey], [bKey])=>aKey.localeCompare(bKey))){
      dataCheckArray.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArray.join("\n");
    const encoder = new TextEncoder();
    const webCryptoSubtle = globalThis.crypto.subtle;
    if (!webCryptoSubtle) {
      console.error("validateInitData: CRITICAL - globalThis.crypto.subtle is not available!");
      return false;
    }
    const webAppDataKeyMaterial = await webCryptoSubtle.importKey("raw", encoder.encode("WebAppData"), {
      name: "HMAC",
      hash: "SHA-256"
    }, false, [
      "sign"
    ]);
    const secretKeyDigest = await webCryptoSubtle.sign("HMAC", webAppDataKeyMaterial, encoder.encode(botToken));
    const validationKey = await webCryptoSubtle.importKey("raw", secretKeyDigest, {
      name: "HMAC",
      hash: "SHA-256"
    }, false, [
      "sign"
    ]);
    const calculatedSignature = await webCryptoSubtle.sign("HMAC", validationKey, encoder.encode(dataCheckString));
    const calculatedHashHex = Array.from(new Uint8Array(calculatedSignature)).map((b)=>b.toString(16).padStart(2, "0")).join("");
    const isValid = calculatedHashHex === hashFromTelegram;
    if (!isValid) console.warn(`validateInitData: Hash MISMATCH!`);
    else console.log("validateInitData: Hash validation SUCCEEDED.");
    return isValid;
  } catch (error) {
    console.error("validateInitData: Error:", error.message);
    return false;
  }
}
// Вспомогательная функция для вызова GoTrue Admin API через fetch
async function callGoTrueAdminAPI(method, path, body) {
  const targetUrl = `${supabaseUrl}/auth/v1${path}`; // supabaseUrl должен быть базовым URL проекта
  console.log(`   callGoTrueAdminAPI: ${method} ${targetUrl}`);
  try {
    const response = await fetch(targetUrl, {
      method: method,
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error(`   GoTrue Admin API error: ${response.status} ${response.statusText}`, responseData);
      return {
        data: null,
        error: responseData || {
          message: `HTTP error ${response.status}`,
          code: response.status
        }
      };
    }
    // console.log("   GoTrue Admin API success. Data:", responseData);
    return {
      data: responseData,
      error: null
    };
  } catch (e) {
    console.error(`   callGoTrueAdminAPI: Network or parsing error for ${path}:`, e);
    return {
      data: null,
      error: {
        message: e.message,
        name: e.name
      }
    };
  }
}
async function findOrCreateUser(telegramUser) {
  console.log("findOrCreateUser: Processing user (Manual GoTrue Calls):", JSON.stringify({
    id: telegramUser.id,
    username: telegramUser.username
  }));
  let telegram_id_num = typeof telegramUser.id === "string" ? parseInt(telegramUser.id, 10) : telegramUser.id;
  const fullName = [
    telegramUser.first_name,
    telegramUser.last_name
  ].filter(Boolean).join(" ") || telegramUser.username || `User_${telegram_id_num}`;
  const userEmail = `telegram${telegram_id_num}@example.com`;
  const currentDate = new Date().toISOString();
  const telegramAuthDate = telegramUser.auth_date ? new Date(telegramUser.auth_date * 1000).toISOString() : currentDate;
  let authUser;
  let userProfile;
  // 1. Попытка найти пользователя в public.users по telegram_id
  let { data: existingUserInPublicTable, error: findPublicError } = await supabase.from("users").select("*").eq("telegram_id", telegram_id_num).maybeSingle();
  if (findPublicError) {
    throw new Error(`DB error finding user by telegram_id: ${findPublicError.message}`);
  }
  if (existingUserInPublicTable && existingUserInPublicTable.id) {
    console.log("   User profile found in public.users by telegram_id. Auth ID:", existingUserInPublicTable.id);
    authUser = {
      id: existingUserInPublicTable.id,
      email: existingUserInPublicTable.email
    }; // Базовый authUser
    // Обновляем метаданные существующего auth пользователя
    const { error: updateMetaError } = await callGoTrueAdminAPI('PUT', `/admin/users/${authUser.id}`, {
      user_metadata: {
        name: fullName,
        telegram_id: telegram_id_num,
        telegram_username: telegramUser.username,
        avatar_url: telegramUser.photo_url,
        last_login: currentDate
      }
    });
    if (updateMetaError) console.warn("   Failed to update auth user metadata:", updateMetaError);
    // Обновляем профиль в public.users
    const updates = {
      name: fullName,
      username: telegramUser.username || existingUserInPublicTable.username,
      avatar_url: telegramUser.photo_url || existingUserInPublicTable.avatar_url,
      last_login: currentDate,
      telegram_auth_date: telegramAuthDate
    };
    const { data: updatedP, error: updErr } = await supabase.from("users").update(updates).eq("id", authUser.id).select().single();
    if (updErr || !updatedP) throw new Error(`Error updating profile in public.users: ${updErr?.message}`);
    userProfile = updatedP;
    console.log("   User profile in public.users updated. ID:", userProfile.id);
  } else {
    console.log("   User profile not found by telegram_id. Attempting to create/find auth user by email.");
    // Пытаемся создать auth пользователя. GoTrue сам обработает конфликт, если email занят.
    const { data: createUserData, error: createUserError } = await callGoTrueAdminAPI('POST', '/admin/users', {
      email: userEmail,
      password: globalThis.crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        name: fullName,
        telegram_id: telegram_id_num,
        telegram_username: telegramUser.username,
        avatar_url: telegramUser.photo_url,
        created_at: currentDate,
        last_login: currentDate
      }
    });
    if (createUserError) {
      // Проверяем, не ошибка ли это "User already registered"
      if (createUserError.msg?.toLowerCase().includes("user already exists") || createUserError.error_description?.toLowerCase().includes("user already exists")) {
        console.warn("   Auth user already exists with this email. Fetching existing auth user by email.");
        const { data: getUserByEmailResp, error: getUserByEmailErr } = await callGoTrueAdminAPI('GET', `/admin/users?email=${encodeURIComponent(userEmail)}`);
        if (getUserByEmailErr || !getUserByEmailResp || !getUserByEmailResp.users || getUserByEmailResp.users.length === 0) {
          console.error("   Failed to fetch existing user by email after 'already exists' error:", getUserByEmailErr || "No user found");
          throw new Error("Inconsistent state: auth user reported as existing but cannot be fetched by email.");
        }
        authUser = getUserByEmailResp.users[0];
        console.log("   Using pre-existing auth user:", authUser.id);
        // Обновляем метаданные существующего auth пользователя
        await callGoTrueAdminAPI('PUT', `/admin/users/${authUser.id}`, {
          user_metadata: {
            name: fullName,
            telegram_id: telegram_id_num,
            telegram_username: telegramUser.username,
            avatar_url: telegramUser.photo_url,
            last_login: currentDate
          }
        });
      } else {
        console.error("   Error creating auth user via API:", createUserError);
        throw new Error(`Error creating auth user via API: ${createUserError.message || JSON.stringify(createUserError)}`);
      }
    } else {
      authUser = createUserData; // GoTrue возвращает объект пользователя после создания
      console.log("   Auth user created via API. ID:", authUser.id);
    }
    if (!authUser || !authUser.id) throw new Error("Could not obtain auth user object.");
    const newUserProfileData = {
      id: authUser.id,
      name: fullName,
      email: userEmail,
      telegram_id: telegram_id_num,
      username: telegramUser.username,
      avatar_url: telegramUser.photo_url,
      created_at: currentDate,
      last_login: currentDate,
      telegram_auth_date: telegramAuthDate,
      total_clicks: 50,
      feed_clicks: 0,
      pet_clicks: 0,
      games_owned: [
        "nut-catcher-game"
      ]
    };
    const { data: newP, error: insErr } = await supabase.from("users").insert(newUserProfileData).select().single();
    if (insErr || !newP) {
      console.error("   Error creating profile in public.users:", insErr?.message);
      // Если auth пользователь был только что создан, откатываем
      if (!createUserError?.msg?.toLowerCase().includes("user already exists")) {
        await callGoTrueAdminAPI('DELETE', `/admin/users/${authUser.id}`);
        console.log("   Rolled back auth user creation due to profile insertion error.");
      }
      throw new Error(`Error creating profile in public.users: ${insErr?.message}`);
    }
    userProfile = newP;
    console.log("   Profile in public.users created. ID:", userProfile.id);
    // Создание персонажа
    console.log("findOrCreateUser: Creating character for new user:", userProfile.id);
    const { error: characterError } = await supabase.from("character").insert({
      id: userProfile.id,
      name: "Тамагочи",
      rating: 0,
      satiety: 50,
      mood: 50,
      /* life_power: 50, */ created_at: currentDate,
      last_interaction: currentDate
    });
    if (characterError) {
      if (characterError.message.includes("duplicate key")) {
        console.warn("findOrCreateUser: Character already exists.");
      } else {
        console.warn("findOrCreateUser: Warning creating character:", characterError.message);
      }
    } else {
      console.log("findOrCreateUser: Character created successfully.");
    }
  }
  return {
    profile: userProfile,
    authUser: authUser
  };
}
// --- Standard Supabase JWT Generation ---
let supabaseJwtCryptoKey = null;
async function getSupabaseJwtKey(secret) {
  if (supabaseJwtCryptoKey) return supabaseJwtCryptoKey;
  const keyBuf = new TextEncoder().encode(secret);
  supabaseJwtCryptoKey = await globalThis.crypto.subtle.importKey("raw", keyBuf, {
    name: "HMAC",
    hash: "SHA-256"
  }, false, [
    "sign",
    "verify"
  ]);
  return supabaseJwtCryptoKey;
}
async function createSupabaseUserJwt(authUser) {
  if (!PROJECT_JWT_SECRET) throw new Error("PROJECT_JWT_SECRET is not set.");
  const key = await getSupabaseJwtKey(PROJECT_JWT_SECRET);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24; // 24 часа жизни токена
  const payload = {
    sub: authUser.id,
    aud: "authenticated",
    role: authUser.role || "authenticated",
    email: authUser.email,
    phone: authUser.phone || undefined,
    app_metadata: authUser.app_metadata || {
      provider: 'email',
      providers: [
        'email'
      ]
    },
    user_metadata: authUser.user_metadata || {},
    iss: "supabase",
    iat: iat,
    exp: exp
  };
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  return await djwt.create(header, payload, key);
}
// --- "Session" Management (генерирует стандартный Supabase JWT) ---
async function generateSupabaseAuthData(authUser, userProfile) {
  console.log(`generateSupabaseAuthData: Creating Supabase JWT for user ID: ${authUser.id}`);
  try {
    const accessToken = await createSupabaseUserJwt(authUser);
    console.log("   Supabase JWT (access_token) generated successfully.");
    const sessionObject = {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600 * 24,
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
      refresh_token: "",
      user: authUser
    };
    return {
      user: userProfile,
      session: sessionObject
    };
  } catch (error) {
    throw error;
  }
}
// --- Main Request Handler ---
serve(async (req)=>{
  const requestStartTs = Date.now();
  const reqUrl = new URL(req.url);
  console.log(`\n--- Request Received [${new Date().toISOString()}] ---`);
  console.log(`-> ${req.method} ${reqUrl.pathname}${reqUrl.search}`);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  const responseHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json"
  };
  try {
    if (req.method !== "POST") {}
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {}
    const telegramDataWrapper = requestBody.telegramData;
    if (!telegramDataWrapper || typeof telegramDataWrapper !== "object") {}
    const initData = telegramDataWrapper.initData;
    let clientProvidedUser = telegramDataWrapper.user;
    let effectiveTelegramUser;
    if (initData && typeof initData === "string" && initData.length > 0) {
      const isValidInitData = await validateInitData(initData);
      if (!isValidInitData) {
        console.error("   initData validation FAILED.");
        if (environment === "production") return new Response(JSON.stringify({
          success: false,
          error: "Invalid Telegram data signature."
        }), {
          status: 401,
          headers: responseHeaders
        });
        if (clientProvidedUser?.id) {
          effectiveTelegramUser = clientProvidedUser;
          console.warn("   [DEV_MODE] Using clientProvidedUser (UNSAFE).");
        } else return new Response(JSON.stringify({
          success: false,
          error: "Invalid Telegram data signature and no fallback user data."
        }), {
          status: 401,
          headers: responseHeaders
        });
      } else {
        try {
          const params = new URLSearchParams(initData);
          const userJson = params.get("user");
          if (userJson) {
            effectiveTelegramUser = JSON.parse(decodeURIComponent(userJson));
            if (params.has("auth_date")) effectiveTelegramUser.auth_date = parseInt(params.get("auth_date"), 10);
          } else throw new Error("'user' field missing in initData.");
        } catch (e) {}
      }
    } else {}
    if (!effectiveTelegramUser || !effectiveTelegramUser.id) {
      return new Response(JSON.stringify({
        success: false,
        error: "No valid Telegram user data to process."
      }), {
        status: 400,
        headers: responseHeaders
      });
    }
    const { profile: userRecordInDb, authUser: actualAuthUser } = await findOrCreateUser(effectiveTelegramUser);
    const authData = await generateSupabaseAuthData(actualAuthUser, userRecordInDb);
    const responsePayload = {
      success: true,
      user: authData.user,
      session: authData.session
    };
    console.log(`   Request processed successfully. Returning Supabase session for user ${userRecordInDb.id}.`);
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("!!! Unhandled Error in Main Handler:", error.message, error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: responseHeaders
    });
  }
});
console.log("--- Function telegram-auth Server Logic Defined (Standard Supabase JWT Strategy with manual GoTrue calls) ---");
