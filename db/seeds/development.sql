-- Development-only examples. Packages are inactive and the provider/model rows remain disabled.
-- Do not use these sample rates or commercial assumptions as production pricing.
INSERT INTO subscription_plans (key, name, monthly_price_cents, included_credit_atoms, currency, features, active)
VALUES
  ('free', 'Free', 0, 500000, 'USD', '{"audience":"trial","environment":"development-seed"}'::jsonb, false),
  ('starter', 'Starter', 1500, 15000000, 'USD', '{"audience":"occasional","environment":"development-seed"}'::jsonb, false),
  ('pro', 'Pro', 3000, 32000000, 'USD', '{"audience":"professional","environment":"development-seed"}'::jsonb, false),
  ('power', 'Power', 6000, 70000000, 'USD', '{"audience":"heavy-use","environment":"development-seed"}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO credit_packages (key, name, price_cents, credit_atoms, currency, active)
VALUES
  ('small-demo', 'Small top-up', 500, 5000000, 'USD', false),
  ('medium-demo', 'Medium top-up', 1000, 10000000, 'USD', false),
  ('large-demo', 'Large top-up', 2500, 25000000, 'USD', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO providers (key, name, integration_mode, commercial_status, enabled, compliance_notes)
VALUES ('think-zone-local-mock', 'Think Zone Local Mock', 'development_mock', 'pending_review', false, 'Deterministic local simulation only; not a real provider and never eligible for production.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO model_catalog (provider_id, key, provider_model_id, display_name, description, capabilities, context_tokens, available)
SELECT p.id, m.key, m.provider_model_id, m.display_name, m.description, '["text"]'::jsonb, 8000, false
FROM providers p
CROSS JOIN (VALUES
  ('tz-mock-balanced', 'local-simulation-balanced', 'Think Zone Balanced', 'Development-only general-purpose mock profile.'),
  ('tz-mock-reasoning', 'local-simulation-reasoning', 'Think Zone Reasoning', 'Development-only reasoning mock profile.')
) AS m(key, provider_model_id, display_name, description)
WHERE p.key = 'think-zone-local-mock'
ON CONFLICT (key) DO NOTHING;

INSERT INTO rate_cards (model_id, version, input_usd_per_million, output_usd_per_million, effective_from)
SELECT id, 1, '0.150000000', '0.600000000', now()
FROM model_catalog WHERE key = 'tz-mock-balanced'
ON CONFLICT (model_id, version) DO NOTHING;

INSERT INTO rate_cards (model_id, version, input_usd_per_million, output_usd_per_million, effective_from)
SELECT id, 1, '1.000000000', '5.000000000', now()
FROM model_catalog WHERE key = 'tz-mock-reasoning'
ON CONFLICT (model_id, version) DO NOTHING;
