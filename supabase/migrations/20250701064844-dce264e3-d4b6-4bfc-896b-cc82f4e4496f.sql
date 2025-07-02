
-- Add foreign key constraint between investment_transactions and investment_partners
ALTER TABLE investment_transactions 
ADD CONSTRAINT fk_investment_transactions_partner 
FOREIGN KEY (partner_id) REFERENCES investment_partners(id) ON DELETE CASCADE;

-- Add a trigger to update partner investment amounts when transactions are added/updated/deleted
CREATE OR REPLACE FUNCTION update_partner_investment_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.transaction_type = 'investment' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount + NEW.amount,
                updated_at = now()
            WHERE id = NEW.partner_id;
        ELSIF NEW.transaction_type = 'withdrawal' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount - NEW.amount,
                updated_at = now()
            WHERE id = NEW.partner_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Reverse the old transaction
        IF OLD.transaction_type = 'investment' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount - OLD.amount,
                updated_at = now()
            WHERE id = OLD.partner_id;
        ELSIF OLD.transaction_type = 'withdrawal' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount + OLD.amount,
                updated_at = now()
            WHERE id = OLD.partner_id;
        END IF;
        
        -- Apply the new transaction
        IF NEW.transaction_type = 'investment' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount + NEW.amount,
                updated_at = now()
            WHERE id = NEW.partner_id;
        ELSIF NEW.transaction_type = 'withdrawal' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount - NEW.amount,
                updated_at = now()
            WHERE id = NEW.partner_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Reverse the transaction
        IF OLD.transaction_type = 'investment' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount - OLD.amount,
                updated_at = now()
            WHERE id = OLD.partner_id;
        ELSIF OLD.transaction_type = 'withdrawal' THEN
            UPDATE investment_partners 
            SET investment_amount = investment_amount + OLD.amount,
                updated_at = now()
            WHERE id = OLD.partner_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_partner_investment ON investment_transactions;
CREATE TRIGGER trigger_update_partner_investment
    AFTER INSERT OR UPDATE OR DELETE ON investment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_partner_investment_amount();

-- Add a column to track initial investment amount (separate from current total)
ALTER TABLE investment_partners 
ADD COLUMN IF NOT EXISTS initial_investment_amount numeric DEFAULT 0;

-- Update existing records to set initial_investment_amount to current investment_amount
UPDATE investment_partners 
SET initial_investment_amount = investment_amount 
WHERE initial_investment_amount = 0;
