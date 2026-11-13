export interface Profile {
	id: string;
	full_name: string;
	email: string;
	role: 'admin' | 'comercial' | 'operaciones' | 'soporte' | 'contador' | 'cliente';
	partner_id: string | null;
	is_active: boolean;
}

export interface Client {
	id: string;
	name: string;
	legal_name: string | null;
	type: 'persona' | 'empresa';
	tax_id: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	lat: number | null;
	lng: number | null;
	status: 'activo' | 'inactivo' | 'prospecto';
	notes: string | null;
	created_at: string;
	contacts?: Contact[];
}

export interface Contact {
	id: string;
	client_id: string;
	name: string;
	role_title: string | null;
	email: string | null;
	phone: string | null;
	is_primary: boolean;
}

export interface ServiceItem {
	id: string;
	name: string;
	category: 'tecnologia' | 'inmobiliario' | 'empresarial';
	description: string | null;
	base_cost: number;
	currency: string;
	is_active: boolean;
}

export interface Partner {
	id: string;
	name: string;
	type: string | null;
	email: string | null;
	phone: string | null;
	tax_id: string | null;
	commission_percent: number;
	notes: string | null;
	is_active: boolean;
	partner_contacts?: PartnerContact[];
}

export interface PartnerContact {
	id: string;
	partner_id: string;
	name: string;
	email: string | null;
	phone: string | null;
}

export interface Stage {
	id: string;
	pipeline_id: string;
	name: string;
	position: number;
	probability: number;
	is_won_stage: boolean;
	is_lost_stage: boolean;
}

export interface Pipeline {
	id: string;
	name: string;
	description: string | null;
	is_active: boolean;
	stages: Stage[];
}

export interface Opportunity {
	id: string;
	title: string;
	client_id: string;
	contact_id: string | null;
	service_id: string | null;
	partner_id: string | null;
	pipeline_id: string;
	stage_id: string;
	amount: number;
	currency: string;
	owner_id: string | null;
	expected_close_date: string | null;
	next_action: string | null;
	next_action_at: string | null;
	status: 'open' | 'won' | 'lost' | 'cancelled';
	outcome_reason: string | null;
	won_at: string | null;
	lost_at: string | null;
	created_at: string;
	client?: Pick<Client, 'id' | 'name' | 'type'> | null;
	service?: Pick<ServiceItem, 'id' | 'name'> | null;
	partner?: Pick<Partner, 'id' | 'name'> | null;
	stage?: Stage | null;
	owner?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface AuditEntry {
	id: string;
	user_id: string | null;
	action: string;
	entity: string;
	entity_id: string | null;
	detail: unknown;
	created_at: string;
	profile?: Pick<Profile, 'full_name' | 'email'> | null;
}
