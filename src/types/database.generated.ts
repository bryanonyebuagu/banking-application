
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "account_preferences": {
                  Row: {
                    "account_id": string,"created_at": string,"currency": string,"customer_id": string,"display_order": number,"id": string,"paperless": boolean,"updated_at": string
                  }
                  Insert: {
                    "account_id": string,"created_at"?: string,"currency": string,"customer_id": string,"display_order"?: number,"id"?: string,"paperless"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"currency"?: string,"customer_id"?: string,"display_order"?: number,"id"?: string,"paperless"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_preferences_account_id_customer_id_currency_fkey"
      columns: ["account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "account_preferences_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"accounts": {
                  Row: {
                    "account_type": string,"closed_at": string | null,"created_at": string,"currency": string,"customer_id": string,"id": string,"masked_account_number": string,"nickname": string,"opened_at": string,"routing_identifier": string,"status": string,"synthetic_identifier": string,"updated_at": string
                  }
                  Insert: {
                    "account_type": string,"closed_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id": string,"id"?: string,"masked_account_number": string,"nickname": string,"opened_at"?: string,"routing_identifier"?: string,"status"?: string,"synthetic_identifier": string,"updated_at"?: string
                  }
                  Update: {
                    "account_type"?: string,"closed_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"masked_account_number"?: string,"nickname"?: string,"opened_at"?: string,"routing_identifier"?: string,"status"?: string,"synthetic_identifier"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accounts_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"addresses": {
                  Row: {
                    "city": string,"country": string,"created_at": string,"customer_id": string,"id": string,"is_primary": boolean,"line1": string,"line2": string | null,"postal_code": string,"state": string | null,"type": string,"updated_at": string
                  }
                  Insert: {
                    "city": string,"country": string,"created_at"?: string,"customer_id": string,"id"?: string,"is_primary"?: boolean,"line1": string,"line2"?: string | null,"postal_code": string,"state"?: string | null,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "city"?: string,"country"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"is_primary"?: boolean,"line1"?: string,"line2"?: string | null,"postal_code"?: string,"state"?: string | null,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addresses_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"app_sessions": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"device_id": string | null,"expires_at": string,"id": string,"idle_expires_at": string,"last_seen_at": string,"provider_session_id": string,"revoked_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"device_id"?: string | null,"expires_at": string,"id"?: string,"idle_expires_at": string,"last_seen_at"?: string,"provider_session_id": string,"revoked_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"device_id"?: string | null,"expires_at"?: string,"id"?: string,"idle_expires_at"?: string,"last_seen_at"?: string,"provider_session_id"?: string,"revoked_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_sessions_device_id_auth_user_id_fkey"
      columns: ["device_id","auth_user_id"]
isOneToOne: false
      referencedRelation: "devices"
      referencedColumns: ["id","auth_user_id"]
    }
                  ]
                },"card_alert_preferences": {
                  Row: {
                    "card_id": string,"created_at": string,"customer_id": string,"id": string,"purchase_alerts": boolean,"threshold_minor": number,"updated_at": string
                  }
                  Insert: {
                    "card_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"purchase_alerts"?: boolean,"threshold_minor"?: number,"updated_at"?: string
                  }
                  Update: {
                    "card_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"purchase_alerts"?: boolean,"threshold_minor"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_alert_preferences_card_id_customer_id_fkey"
      columns: ["card_id","customer_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id","customer_id"]
    },{
      foreignKeyName: "card_alert_preferences_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"card_transactions": {
                  Row: {
                    "amount_minor": number,"card_id": string,"category": string,"created_at": string,"currency": string,"customer_id": string,"hold_id": string | null,"id": string,"journal_id": string | null,"kind": string,"location": string | null,"merchant": string,"original_id": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "amount_minor": number,"card_id": string,"category"?: string,"created_at"?: string,"currency": string,"customer_id": string,"hold_id"?: string | null,"id"?: string,"journal_id"?: string | null,"kind": string,"location"?: string | null,"merchant": string,"original_id"?: string | null,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"card_id"?: string,"category"?: string,"created_at"?: string,"currency"?: string,"customer_id"?: string,"hold_id"?: string | null,"id"?: string,"journal_id"?: string | null,"kind"?: string,"location"?: string | null,"merchant"?: string,"original_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_transactions_card_id_customer_id_currency_fkey"
      columns: ["card_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "card_transactions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_transactions_original_id_customer_id_currency_fkey"
      columns: ["original_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "card_transactions"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"cards": {
                  Row: {
                    "cardholder": string,"created_at": string,"credit_account_id": string,"currency": string,"customer_id": string,"id": string,"last_four": string,"purchase_limit_minor": number,"replaced_card_id": string | null,"status": string,"synthetic_token": string,"updated_at": string
                  }
                  Insert: {
                    "cardholder": string,"created_at"?: string,"credit_account_id": string,"currency": string,"customer_id": string,"id"?: string,"last_four": string,"purchase_limit_minor": number,"replaced_card_id"?: string | null,"status": string,"synthetic_token": string,"updated_at"?: string
                  }
                  Update: {
                    "cardholder"?: string,"created_at"?: string,"credit_account_id"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"last_four"?: string,"purchase_limit_minor"?: number,"replaced_card_id"?: string | null,"status"?: string,"synthetic_token"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_credit_account_id_customer_id_currency_fkey"
      columns: ["credit_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "credit_accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "cards_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_replaced_card_id_customer_id_currency_fkey"
      columns: ["replaced_card_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"check_deposits": {
                  Row: {
                    "account_id": string,"amount_minor": number,"created_at": string,"currency": string,"customer_id": string,"id": string,"journal_id": string | null,"mime_type": string | null,"object_key": string,"reviewed_at": string | null,"size_bytes": number | null,"status": string,"updated_at": string,"upload_state": string
                  }
                  Insert: {
                    "account_id": string,"amount_minor": number,"created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"journal_id"?: string | null,"mime_type"?: string | null,"object_key": string,"reviewed_at"?: string | null,"size_bytes"?: number | null,"status": string,"updated_at"?: string,"upload_state"?: string
                  }
                  Update: {
                    "account_id"?: string,"amount_minor"?: number,"created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"journal_id"?: string | null,"mime_type"?: string | null,"object_key"?: string,"reviewed_at"?: string | null,"size_bytes"?: number | null,"status"?: string,"updated_at"?: string,"upload_state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "check_deposits_account_id_customer_id_currency_fkey"
      columns: ["account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "check_deposits_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_accounts": {
                  Row: {
                    "created_at": string,"credit_limit_minor": number,"currency": string,"customer_id": string,"cycle_day": number,"due_day": number,"id": string,"ledger_account_id": string,"minimum_payment_minor": number,"next_due_date": string | null,"statement_balance_minor": number,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"credit_limit_minor": number,"currency": string,"customer_id": string,"cycle_day": number,"due_day": number,"id"?: string,"ledger_account_id": string,"minimum_payment_minor"?: number,"next_due_date"?: string | null,"statement_balance_minor"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"credit_limit_minor"?: number,"currency"?: string,"customer_id"?: string,"cycle_day"?: number,"due_day"?: number,"id"?: string,"ledger_account_id"?: string,"minimum_payment_minor"?: number,"next_due_date"?: string | null,"statement_balance_minor"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_accounts_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_documents": {
                  Row: {
                    "created_at": string,"customer_id": string,"id": string,"kind": string,"mime_type": string,"object_key": string,"size_bytes": number,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"customer_id": string,"id"?: string,"kind": string,"mime_type": string,"object_key": string,"size_bytes": number,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"id"?: string,"kind"?: string,"mime_type"?: string,"object_key"?: string,"size_bytes"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_documents_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_preferences": {
                  Row: {
                    "created_at": string,"customer_id": string,"hide_balances": boolean,"id": string,"locale": string,"marketing_opt_in": boolean,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"customer_id": string,"hide_balances"?: boolean,"id"?: string,"locale"?: string,"marketing_opt_in"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"hide_balances"?: boolean,"id"?: string,"locale"?: string,"marketing_opt_in"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_preferences_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: true
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "account_status": string,"auth_user_id": string,"contact_email": string,"created_at": string,"customer_since": string,"date_of_birth": string | null,"employment": string | null,"first_name": string,"id": string,"income_range": string | null,"last_name": string,"middle_name": string | null,"phone": string | null,"profile_id": string,"updated_at": string,"verification_status": string
                  }
                  Insert: {
                    "account_status"?: string,"auth_user_id": string,"contact_email": string,"created_at"?: string,"customer_since"?: string,"date_of_birth"?: string | null,"employment"?: string | null,"first_name": string,"id"?: string,"income_range"?: string | null,"last_name": string,"middle_name"?: string | null,"phone"?: string | null,"profile_id": string,"updated_at"?: string,"verification_status"?: string
                  }
                  Update: {
                    "account_status"?: string,"auth_user_id"?: string,"contact_email"?: string,"created_at"?: string,"customer_since"?: string,"date_of_birth"?: string | null,"employment"?: string | null,"first_name"?: string,"id"?: string,"income_range"?: string | null,"last_name"?: string,"middle_name"?: string | null,"phone"?: string | null,"profile_id"?: string,"updated_at"?: string,"verification_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_profile_id_auth_user_id_fkey"
      columns: ["profile_id","auth_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id","auth_user_id"]
    }
                  ]
                },"devices": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"device_token_hash": string,"id": string,"label": string,"revoked_at": string | null,"trusted_until": string | null,"updated_at": string
                  }
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"device_token_hash": string,"id"?: string,"label": string,"revoked_at"?: string | null,"trusted_until"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"device_token_hash"?: string,"id"?: string,"label"?: string,"revoked_at"?: string | null,"trusted_until"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"investment_accounts": {
                  Row: {
                    "cash_ledger_account_id": string,"created_at": string,"currency": string,"customer_id": string,"id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "cash_ledger_account_id": string,"created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "cash_ledger_account_id"?: string,"created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "investment_accounts_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"investment_holdings": {
                  Row: {
                    "cost_basis_minor": number,"created_at": string,"currency": string,"customer_id": string,"id": string,"instrument_id": string,"investment_account_id": string,"quantity": number,"updated_at": string
                  }
                  Insert: {
                    "cost_basis_minor": number,"created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"instrument_id": string,"investment_account_id": string,"quantity": number,"updated_at"?: string
                  }
                  Update: {
                    "cost_basis_minor"?: number,"created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"instrument_id"?: string,"investment_account_id"?: string,"quantity"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "investment_holdings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "investment_holdings_investment_account_id_customer_id_curr_fkey"
      columns: ["investment_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "investment_accounts"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"investment_transactions": {
                  Row: {
                    "cash_amount_minor": number,"created_at": string,"currency": string,"customer_id": string,"id": string,"instrument_id": string | null,"investment_account_id": string,"journal_id": string,"kind": string,"occurred_at": string,"price": number | null,"quantity": number | null,"updated_at": string
                  }
                  Insert: {
                    "cash_amount_minor": number,"created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"instrument_id"?: string | null,"investment_account_id": string,"journal_id": string,"kind": string,"occurred_at": string,"price"?: number | null,"quantity"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "cash_amount_minor"?: number,"created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"instrument_id"?: string | null,"investment_account_id"?: string,"journal_id"?: string,"kind"?: string,"occurred_at"?: string,"price"?: number | null,"quantity"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "investment_transactions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "investment_transactions_investment_account_id_customer_id__fkey"
      columns: ["investment_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "investment_accounts"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"loan_payments": {
                  Row: {
                    "created_at": string,"currency": string,"customer_id": string,"fee_minor": number,"funding_account_id": string,"id": string,"interest_minor": number,"journal_id": string | null,"loan_id": string,"paid_at": string | null,"principal_minor": number,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"currency": string,"customer_id": string,"fee_minor": number,"funding_account_id": string,"id"?: string,"interest_minor": number,"journal_id"?: string | null,"loan_id": string,"paid_at"?: string | null,"principal_minor": number,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"customer_id"?: string,"fee_minor"?: number,"funding_account_id"?: string,"id"?: string,"interest_minor"?: number,"journal_id"?: string | null,"loan_id"?: string,"paid_at"?: string | null,"principal_minor"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loan_payments_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loan_payments_funding_account_id_customer_id_currency_fkey"
      columns: ["funding_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "loan_payments_loan_id_customer_id_currency_fkey"
      columns: ["loan_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "loans"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"loans": {
                  Row: {
                    "created_at": string,"currency": string,"customer_id": string,"id": string,"kind": string,"ledger_account_id": string,"monthly_payment_minor": number,"next_due_date": string | null,"origination_journal_id": string | null,"principal_minor": number,"rate": number,"status": string,"term_months": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"kind": string,"ledger_account_id": string,"monthly_payment_minor": number,"next_due_date"?: string | null,"origination_journal_id"?: string | null,"principal_minor": number,"rate": number,"status": string,"term_months": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"kind"?: string,"ledger_account_id"?: string,"monthly_payment_minor"?: number,"next_due_date"?: string | null,"origination_journal_id"?: string | null,"principal_minor"?: number,"rate"?: number,"status"?: string,"term_months"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loans_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"login_events": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"event_type": string,"id": string,"occurred_at": string,"outcome": string,"reason_code": string | null
                  }
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"event_type": string,"id"?: string,"occurred_at": string,"outcome": string,"reason_code"?: string | null
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"event_type"?: string,"id"?: string,"occurred_at"?: string,"outcome"?: string,"reason_code"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"mortgage_applications": {
                  Row: {
                    "created_at": string,"currency": string,"customer_id": string,"id": string,"mortgage_id": string | null,"requested_amount_minor": number,"requested_term_months": number | null,"review_audit_id": string | null,"status": string,"synthetic_employment_id": string,"synthetic_property_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"mortgage_id"?: string | null,"requested_amount_minor": number,"requested_term_months"?: number | null,"review_audit_id"?: string | null,"status": string,"synthetic_employment_id": string,"synthetic_property_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"mortgage_id"?: string | null,"requested_amount_minor"?: number,"requested_term_months"?: number | null,"review_audit_id"?: string | null,"status"?: string,"synthetic_employment_id"?: string,"synthetic_property_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mortgage_applications_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mortgage_applications_mortgage_id_fkey"
      columns: ["mortgage_id"]
isOneToOne: true
      referencedRelation: "mortgages"
      referencedColumns: ["id"]
    }
                  ]
                },"mortgage_payments": {
                  Row: {
                    "created_at": string,"currency": string,"customer_id": string,"escrow_minor": number,"funding_account_id": string,"id": string,"interest_minor": number,"journal_id": string | null,"mortgage_id": string,"paid_at": string | null,"principal_minor": number,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"currency": string,"customer_id": string,"escrow_minor": number,"funding_account_id": string,"id"?: string,"interest_minor": number,"journal_id"?: string | null,"mortgage_id": string,"paid_at"?: string | null,"principal_minor": number,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"customer_id"?: string,"escrow_minor"?: number,"funding_account_id"?: string,"id"?: string,"interest_minor"?: number,"journal_id"?: string | null,"mortgage_id"?: string,"paid_at"?: string | null,"principal_minor"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mortgage_payments_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mortgage_payments_funding_account_id_customer_id_currency_fkey"
      columns: ["funding_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "mortgage_payments_mortgage_id_customer_id_currency_fkey"
      columns: ["mortgage_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "mortgages"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"mortgages": {
                  Row: {
                    "created_at": string,"currency": string,"customer_id": string,"escrow_ledger_account_id": string,"escrow_monthly_minor": number,"id": string,"ledger_account_id": string,"monthly_payment_minor": number,"next_due_date": string | null,"origination_journal_id": string | null,"principal_minor": number,"rate": number,"status": string,"term_months": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"currency": string,"customer_id": string,"escrow_ledger_account_id": string,"escrow_monthly_minor"?: number,"id"?: string,"ledger_account_id": string,"monthly_payment_minor": number,"next_due_date"?: string | null,"origination_journal_id"?: string | null,"principal_minor": number,"rate": number,"status": string,"term_months": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"customer_id"?: string,"escrow_ledger_account_id"?: string,"escrow_monthly_minor"?: number,"id"?: string,"ledger_account_id"?: string,"monthly_payment_minor"?: number,"next_due_date"?: string | null,"origination_journal_id"?: string | null,"principal_minor"?: number,"rate"?: number,"status"?: string,"term_months"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mortgages_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "channel": string,"created_at": string,"customer_id": string,"enabled": boolean,"id": string,"type": string,"updated_at": string
                  }
                  Insert: {
                    "channel": string,"created_at"?: string,"customer_id": string,"enabled"?: boolean,"id"?: string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"customer_id"?: string,"enabled"?: boolean,"id"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"customer_id": string,"event_id": string,"id": string,"read_at": string | null,"resource_id": string | null,"resource_type": string | null,"title": string,"type": string,"updated_at": string
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"customer_id": string,"event_id": string,"id"?: string,"read_at"?: string | null,"resource_id"?: string | null,"resource_type"?: string | null,"title": string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"customer_id"?: string,"event_id"?: string,"id"?: string,"read_at"?: string | null,"resource_id"?: string | null,"resource_type"?: string | null,"title"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"payees": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"customer_id": string,"id": string,"name": string,"synthetic_reference": string,"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"customer_id": string,"id"?: string,"name": string,"synthetic_reference": string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"customer_id"?: string,"id"?: string,"name"?: string,"synthetic_reference"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payees_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "account_id": string,"amount_minor": number,"created_at": string,"currency": string,"customer_id": string,"id": string,"journal_id": string | null,"payee_id": string,"schedule_id": string | null,"scheduled_at": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "account_id": string,"amount_minor": number,"created_at"?: string,"currency": string,"customer_id": string,"id"?: string,"journal_id"?: string | null,"payee_id": string,"schedule_id"?: string | null,"scheduled_at"?: string | null,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"amount_minor"?: number,"created_at"?: string,"currency"?: string,"customer_id"?: string,"id"?: string,"journal_id"?: string | null,"payee_id"?: string,"schedule_id"?: string | null,"scheduled_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_account_id_customer_id_currency_fkey"
      columns: ["account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "payments_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_payee_id_customer_id_fkey"
      columns: ["payee_id","customer_id"]
isOneToOne: false
      referencedRelation: "payees"
      referencedColumns: ["id","customer_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"display_name": string,"id": string,"locale": string,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"display_name"?: string,"id"?: string,"locale"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"locale"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"registration_drafts": {
                  Row: {
                    "auth_user_id": string,"city": string | null,"country": string | null,"created_at": string,"current_step": string,"date_of_birth": string | null,"employment": string | null,"first_name": string | null,"id": string,"income_range": string | null,"last_name": string | null,"line1": string | null,"line2": string | null,"middle_name": string | null,"phone": string | null,"postal_code": string | null,"state": string | null,"updated_at": string
                  }
                  Insert: {
                    "auth_user_id": string,"city"?: string | null,"country"?: string | null,"created_at"?: string,"current_step"?: string,"date_of_birth"?: string | null,"employment"?: string | null,"first_name"?: string | null,"id"?: string,"income_range"?: string | null,"last_name"?: string | null,"line1"?: string | null,"line2"?: string | null,"middle_name"?: string | null,"phone"?: string | null,"postal_code"?: string | null,"state"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"city"?: string | null,"country"?: string | null,"created_at"?: string,"current_step"?: string,"date_of_birth"?: string | null,"employment"?: string | null,"first_name"?: string | null,"id"?: string,"income_range"?: string | null,"last_name"?: string | null,"line1"?: string | null,"line2"?: string | null,"middle_name"?: string | null,"phone"?: string | null,"postal_code"?: string | null,"state"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"security_events": {
                  Row: {
                    "auth_user_id": string,"correlation_id": string,"created_at": string,"event_type": string,"id": string,"occurred_at": string,"outcome": string,"reason_code": string | null
                  }
                  Insert: {
                    "auth_user_id": string,"correlation_id": string,"created_at"?: string,"event_type": string,"id"?: string,"occurred_at": string,"outcome": string,"reason_code"?: string | null
                  }
                  Update: {
                    "auth_user_id"?: string,"correlation_id"?: string,"created_at"?: string,"event_type"?: string,"id"?: string,"occurred_at"?: string,"outcome"?: string,"reason_code"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"statements": {
                  Row: {
                    "account_id": string | null,"closing_minor": number,"created_at": string,"credit_account_id": string | null,"currency": string,"customer_id": string,"id": string,"ledger_cutoff": string,"object_key": string | null,"opening_minor": number,"period_end": string,"period_start": string,"status": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "account_id"?: string | null,"closing_minor": number,"created_at"?: string,"credit_account_id"?: string | null,"currency": string,"customer_id": string,"id"?: string,"ledger_cutoff": string,"object_key"?: string | null,"opening_minor": number,"period_end": string,"period_start": string,"status": string,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "account_id"?: string | null,"closing_minor"?: number,"created_at"?: string,"credit_account_id"?: string | null,"currency"?: string,"customer_id"?: string,"id"?: string,"ledger_cutoff"?: string,"object_key"?: string | null,"opening_minor"?: number,"period_end"?: string,"period_start"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "statements_account_id_customer_id_currency_fkey"
      columns: ["account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "statements_credit_account_id_customer_id_currency_fkey"
      columns: ["credit_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "credit_accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "statements_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"support_messages": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"customer_id": string,"id": string,"ticket_id": string,"updated_at": string,"visibility": string
                  }
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"customer_id": string,"id"?: string,"ticket_id": string,"updated_at"?: string,"visibility": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"ticket_id"?: string,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_messages_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "support_messages_ticket_id_customer_id_fkey"
      columns: ["ticket_id","customer_id"]
isOneToOne: false
      referencedRelation: "support_tickets"
      referencedColumns: ["id","customer_id"]
    }
                  ]
                },"support_tickets": {
                  Row: {
                    "assigned_staff_id": string | null,"created_at": string,"customer_id": string,"id": string,"status": string,"subject": string,"updated_at": string
                  }
                  Insert: {
                    "assigned_staff_id"?: string | null,"created_at"?: string,"customer_id": string,"id"?: string,"status": string,"subject": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_staff_id"?: string | null,"created_at"?: string,"customer_id"?: string,"id"?: string,"status"?: string,"subject"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_tickets_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "account_id": string,"amount_minor": number,"category": string,"created_at": string,"currency": string,"customer_id": string,"description": string,"direction": string,"id": string,"journal_id": string | null,"merchant": string | null,"operation_id": string,"original_transaction_id": string | null,"posted_at": string | null,"status": string,"type": string,"updated_at": string
                  }
                  Insert: {
                    "account_id": string,"amount_minor": number,"category"?: string,"created_at"?: string,"currency": string,"customer_id": string,"description": string,"direction": string,"id"?: string,"journal_id"?: string | null,"merchant"?: string | null,"operation_id": string,"original_transaction_id"?: string | null,"posted_at"?: string | null,"status": string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"amount_minor"?: number,"category"?: string,"created_at"?: string,"currency"?: string,"customer_id"?: string,"description"?: string,"direction"?: string,"id"?: string,"journal_id"?: string | null,"merchant"?: string | null,"operation_id"?: string,"original_transaction_id"?: string | null,"posted_at"?: string | null,"status"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_account_id_customer_id_currency_fkey"
      columns: ["account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    },{
      foreignKeyName: "transactions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_original_transaction_id_customer_id_currency_fkey"
      columns: ["original_transaction_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"transfer_recipients": {
                  Row: {
                    "created_at": string,"customer_id": string,"destination_token": string,"id": string,"label": string,"masked_identifier": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"customer_id": string,"destination_token": string,"id"?: string,"label": string,"masked_identifier": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"destination_token"?: string,"id"?: string,"label"?: string,"masked_identifier"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transfer_recipients_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"transfers": {
                  Row: {
                    "amount_minor": number,"created_at": string,"currency": string,"customer_id": string,"destination_account_id": string | null,"id": string,"journal_id": string | null,"memo": string | null,"recipient_id": string | null,"schedule_id": string | null,"scheduled_at": string | null,"source_account_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"currency": string,"customer_id": string,"destination_account_id"?: string | null,"id"?: string,"journal_id"?: string | null,"memo"?: string | null,"recipient_id"?: string | null,"schedule_id"?: string | null,"scheduled_at"?: string | null,"source_account_id": string,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"currency"?: string,"customer_id"?: string,"destination_account_id"?: string | null,"id"?: string,"journal_id"?: string | null,"memo"?: string | null,"recipient_id"?: string | null,"schedule_id"?: string | null,"scheduled_at"?: string | null,"source_account_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transfers_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transfers_destination_account_id_currency_fkey"
      columns: ["destination_account_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","currency"]
    },{
      foreignKeyName: "transfers_recipient_id_customer_id_fkey"
      columns: ["recipient_id","customer_id"]
isOneToOne: false
      referencedRelation: "transfer_recipients"
      referencedColumns: ["id","customer_id"]
    },{
      foreignKeyName: "transfers_source_account_id_customer_id_currency_fkey"
      columns: ["source_account_id","customer_id","currency"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id","customer_id","currency"]
    }
                  ]
                },"verification_records": {
                  Row: {
                    "created_at": string,"customer_id": string,"id": string,"provider": string,"provider_reference": string | null,"reason_code": string | null,"reviewed_by": string | null,"status": string,"synthetic_fixture_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"customer_id": string,"id"?: string,"provider"?: string,"provider_reference"?: string | null,"reason_code"?: string | null,"reviewed_by"?: string | null,"status": string,"synthetic_fixture_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"id"?: string,"provider"?: string,"provider_reference"?: string | null,"reason_code"?: string | null,"reviewed_by"?: string | null,"status"?: string,"synthetic_fixture_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_records_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "abandon_current_check_upload":
{ Args: { "p_deposit_id": string }; Returns: undefined
                           },
"abandon_current_statement":
{ Args: { "p_statement_id": string }; Returns: undefined
                           },
"archive_current_payee":
{ Args: { "p_payee_id": string }; Returns: undefined
                           },
"archive_current_transfer_recipient":
{ Args: { "p_recipient_id": string }; Returns: undefined
                           },
"authorize_current_card_purchase":
{ Args: { "p_amount_minor": number,"p_card_id": string,"p_category": string,"p_expires_at": string,"p_idempotency_key": string,"p_location": string,"p_merchant": string }; Returns: string
                           },
"begin_current_account_statement":
{ Args: { "p_account_id": string,"p_object_key": string,"p_period_end": string,"p_period_start": string,"p_statement_id": string }; Returns: string
                           },
"begin_current_check_deposit":
{ Args: { "p_account_id": string,"p_amount_minor": number,"p_deposit_id": string,"p_mime_type": string,"p_object_key": string,"p_size_bytes": number }; Returns: string
                           },
"begin_current_check_review":
{ Args: { "p_deposit_id": string }; Returns: undefined
                           },
"begin_current_document_upload":
{ Args: { "p_document_id": string,"p_kind": string,"p_mime_type": string,"p_object_key": string,"p_size_bytes": number }; Returns: string
                           },
"begin_current_synthetic_verification":
{ Args: { "p_fixture_id": string }; Returns: string
                           },
"cancel_current_scheduled_payment":
{ Args: { "p_payment_id": string }; Returns: undefined
                           },
"cancel_current_scheduled_transfer":
{ Args: { "p_transfer_id": string }; Returns: undefined
                           },
"close_current_support_ticket":
{ Args: { "p_ticket_id": string }; Returns: undefined
                           },
"complete_current_registration":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"complete_current_synthetic_verification":
{ Args: { "p_record_id": string,"p_test_answer": string }; Returns: string
                           },
"create_current_payee":
{ Args: { "p_name": string,"p_synthetic_reference": string }; Returns: string
                           },
"create_current_support_ticket":
{ Args: { "p_body": string,"p_subject": string }; Returns: string
                           },
"create_current_transfer_recipient":
{ Args: { "p_destination_token": string,"p_label": string }; Returns: string
                           },
"delete_current_document":
{ Args: { "p_document_id": string }; Returns: undefined
                           },
"execute_current_payment":
{ Args: { "p_account_id": string,"p_amount_minor": number,"p_idempotency_key": string,"p_payee_id": string }; Returns: string
                           },
"execute_current_transfer":
{ Args: { "p_amount_minor"?: number,"p_destination_account_id"?: string,"p_idempotency_key"?: string,"p_memo"?: string,"p_recipient_id"?: string,"p_source_account_id": string }; Returns: string
                           },
"finalize_current_check_upload":
{ Args: { "p_deposit_id": string }; Returns: undefined
                           },
"finalize_current_document_upload":
{ Args: { "p_document_id": string }; Returns: undefined
                           },
"finalize_current_statement":
{ Args: { "p_statement_id": string }; Returns: undefined
                           },
"fund_current_account_synthetic":
{ Args: { "p_account_id": string,"p_amount_minor": number,"p_idempotency_key": string }; Returns: string
                           },
"fund_current_investment_account":
{ Args: { "p_amount_minor": number,"p_funding_account_id": string,"p_idempotency_key": string,"p_investment_account_id": string }; Returns: string
                           },
"get_current_account_balances":
{ Args: Record<PropertyKey, never>; Returns: {
              "account_id": string,"available_balance_minor": number,"currency": string,"ledger_balance_minor": number
            }[]
                           },
"get_current_app_session_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_current_credit_balances":
{ Args: Record<PropertyKey, never>; Returns: {
              "available_credit_minor": number,"credit_account_id": string,"currency": string,"current_balance_minor": number,"pending_minor": number
            }[]
                           },
"get_current_investment_instruments":
{ Args: Record<PropertyKey, never>; Returns: {
              "currency": string,"id": string,"name": string,"observed_at": string,"price": number,"symbol": string
            }[]
                           },
"get_current_investment_overview":
{ Args: Record<PropertyKey, never>; Returns: {
              "cash_minor": number,"cost_basis_minor": number,"currency": string,"investment_account_id": string,"market_value_minor": number
            }[]
                           },
"get_current_loan_balances":
{ Args: Record<PropertyKey, never>; Returns: {
              "accrued_interest_minor": number,"currency": string,"loan_id": string,"outstanding_minor": number,"payoff_minor": number
            }[]
                           },
"get_current_mortgage_balances":
{ Args: Record<PropertyKey, never>; Returns: {
              "accrued_interest_minor": number,"currency": string,"escrow_balance_minor": number,"mortgage_id": string,"outstanding_minor": number
            }[]
                           },
"get_current_statement_activity":
{ Args: { "p_statement_id": string }; Returns: {
              "activity_at": string,"amount_minor": number,"description": string,"direction": string,"id": string
            }[]
                           },
"mark_all_current_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"mark_current_notification_read":
{ Args: { "p_notification_id": string,"p_read"?: boolean }; Returns: undefined
                           },
"open_current_account":
{ Args: { "p_account_type": string,"p_nickname": string }; Returns: string
                           },
"open_current_credit_card":
{ Args: { "p_cardholder": string,"p_credit_limit_minor": number,"p_idempotency_key": string }; Returns: string
                           },
"open_current_investment_account":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"open_current_simulated_loan":
{ Args: { "p_funding_account_id": string,"p_idempotency_key": string,"p_kind": string,"p_loan_id": string,"p_principal_minor": number,"p_term_months": number }; Returns: string
                           },
"pay_current_credit_card":
{ Args: { "p_account_id": string,"p_amount_minor": number,"p_card_id": string,"p_idempotency_key": string }; Returns: string
                           },
"pay_current_loan":
{ Args: { "p_funding_account_id": string,"p_idempotency_key": string,"p_loan_id": string }; Returns: string
                           },
"pay_current_mortgage":
{ Args: { "p_funding_account_id": string,"p_idempotency_key": string,"p_mortgage_id": string }; Returns: string
                           },
"place_current_account_hold":
{ Args: { "p_account_id": string,"p_amount_minor": number,"p_expires_at": string,"p_idempotency_key": string }; Returns: string
                           },
"process_due_payment_jobs":
{ Args: { "p_limit"?: number }; Returns: {
              "payment_id": string,"result_status": string
            }[]
                           },
"process_due_transfer_jobs":
{ Args: { "p_limit"?: number }; Returns: {
              "result_status": string,"transfer_id": string
            }[]
                           },
"record_current_login_event":
{ Args: { "p_event_type": string }; Returns: string
                           },
"record_current_security_event":
{ Args: { "p_event_type": string }; Returns: string
                           },
"refund_current_card_purchase":
{ Args: { "p_amount_minor": number,"p_idempotency_key": string,"p_original_id": string }; Returns: string
                           },
"register_current_device":
{ Args: { "p_device_id": string,"p_device_token_hash": string,"p_label": string,"p_trust_days": number }; Returns: string
                           },
"release_current_account_hold":
{ Args: { "p_hold_id": string }; Returns: undefined
                           },
"release_current_card_purchase":
{ Args: { "p_card_transaction_id": string }; Returns: undefined
                           },
"rename_current_account":
{ Args: { "p_account_id": string,"p_nickname": string }; Returns: undefined
                           },
"replace_current_card":
{ Args: { "p_card_id": string }; Returns: string
                           },
"reply_current_support_ticket":
{ Args: { "p_body": string,"p_ticket_id": string }; Returns: string
                           },
"resolve_current_check_deposit":
{ Args: { "p_deposit_id": string,"p_idempotency_key": string,"p_outcome": string }; Returns: string
                           },
"reverse_current_transaction":
{ Args: { "p_idempotency_key": string,"p_transaction_id": string }; Returns: string
                           },
"review_current_simulated_mortgage_application":
{ Args: { "p_application_id": string }; Returns: string
                           },
"revoke_all_current_user_sessions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"revoke_current_device":
{ Args: { "p_device_id": string }; Returns: undefined
                           },
"revoke_current_session":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"revoke_current_user_session":
{ Args: { "p_app_session_id": string }; Returns: undefined
                           },
"save_current_registration_address":
{ Args: { "p_city": string,"p_country": string,"p_line1": string,"p_line2": string,"p_postal_code": string,"p_state": string }; Returns: string
                           },
"save_current_registration_employment":
{ Args: { "p_employment": string,"p_income_range": string }; Returns: string
                           },
"save_current_registration_personal":
{ Args: { "p_date_of_birth": string,"p_first_name": string,"p_last_name": string,"p_middle_name": string,"p_phone": string }; Returns: string
                           },
"schedule_current_payment":
{ Args: { "p_account_id": string,"p_amount_minor": number,"p_end_at"?: string,"p_frequency"?: string,"p_idempotency_key"?: string,"p_local_time"?: string,"p_payee_id": string,"p_scheduled_at": string,"p_timezone"?: string }; Returns: string
                           },
"schedule_current_transfer":
{ Args: { "p_amount_minor"?: number,"p_destination_account_id"?: string,"p_end_at"?: string,"p_frequency"?: string,"p_idempotency_key"?: string,"p_local_time"?: string,"p_memo"?: string,"p_recipient_id"?: string,"p_scheduled_at"?: string,"p_source_account_id": string,"p_timezone"?: string }; Returns: string
                           },
"search_current_transactions":
{ Args: { "p_amount_max"?: number,"p_amount_min"?: number,"p_category"?: string,"p_cursor_created_at"?: string,"p_cursor_id"?: string,"p_date_from"?: string,"p_date_to"?: string,"p_page_size"?: number,"p_query"?: string,"p_status"?: string }; Returns: {
              "account_id": string,"account_nickname": string,"amount_minor": number,"category": string,"created_at": string,"currency": string,"description": string,"direction": string,"id": string,"masked_account_number": string,"merchant": string,"posted_at": string,"status": string,"type": string
            }[]
                           },
"set_current_notification_preference":
{ Args: { "p_enabled": boolean,"p_type": string }; Returns: undefined
                           },
"settle_current_card_purchase":
{ Args: { "p_card_transaction_id": string,"p_idempotency_key": string }; Returns: string
                           },
"staff_claim_support_ticket":
{ Args: { "p_ticket_id": string }; Returns: undefined
                           },
"staff_get_context":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"staff_get_customer_snapshot":
{ Args: { "p_customer_id": string }; Returns: Json
                           },
"staff_get_support_ticket":
{ Args: { "p_ticket_id": string }; Returns: Json
                           },
"staff_list_audit_logs":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"staff_list_support_tickets":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"staff_provision_role":
{ Args: { "p_auth_user_id": string,"p_reason": string,"p_role": string }; Returns: string
                           },
"staff_reply_support_ticket":
{ Args: { "p_body": string,"p_status": string,"p_ticket_id": string,"p_visibility": string }; Returns: string
                           },
"staff_review_verification":
{ Args: { "p_reason": string,"p_record_id": string,"p_status": string }; Returns: undefined
                           },
"staff_search_customers":
{ Args: { "p_query"?: string }; Returns: Json
                           },
"staff_set_account_restriction":
{ Args: { "p_account_id": string,"p_reason": string,"p_status": string }; Returns: undefined
                           },
"submit_current_mortgage_application":
{ Args: { "p_amount_minor": number,"p_employment_id": string,"p_property_id": string,"p_term_months": number }; Returns: string
                           },
"sync_current_notifications":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"sync_current_session":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"trade_current_investment":
{ Args: { "p_idempotency_key": string,"p_instrument_id": string,"p_investment_account_id": string,"p_kind": string,"p_quantity": number }; Returns: string
                           },
"update_current_card_preferences":
{ Args: { "p_card_id": string,"p_purchase_alerts": boolean,"p_purchase_limit_minor": number,"p_threshold_minor": number }; Returns: undefined
                           },
"update_current_card_status":
{ Args: { "p_action": string,"p_card_id": string }; Returns: undefined
                           },
"update_current_contact":
{ Args: { "p_display_name": string,"p_phone": string }; Returns: undefined
                           },
"update_current_preferences":
{ Args: { "p_hide_balances": boolean,"p_locale": string,"p_marketing_opt_in": boolean,"p_timezone": string }; Returns: undefined
                           },
"update_current_primary_address":
{ Args: { "p_city": string,"p_country": string,"p_line1": string,"p_line2": string,"p_postal_code": string,"p_state": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
