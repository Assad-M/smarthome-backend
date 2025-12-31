--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2025-12-29 12:48:17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- Tables
CREATE TABLE public.bookings (
    id integer NOT NULL,
    user_id integer,
    service_id integer,
    booking_date timestamp with time zone NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    provider_id integer,
    accepted_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    estimated_hours integer,
    estimated_price numeric,
    workers_requested integer DEFAULT 1,
    booking_details jsonb
);

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;
ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);
ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    read_status boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(50) DEFAULT 'general'::character varying,
    archived boolean DEFAULT false
);

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;
ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

CREATE TABLE public.providers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    skill character varying(100) NOT NULL,
    experience_years integer DEFAULT 1,
    rating numeric(3,2) DEFAULT 5.0,
    bio text,
    validated boolean DEFAULT false
);

CREATE SEQUENCE public.providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.providers_id_seq OWNED BY public.providers.id;
ALTER TABLE ONLY public.providers ALTER COLUMN id SET DEFAULT nextval('public.providers_id_seq'::regclass);
ALTER TABLE ONLY public.providers ADD CONSTRAINT providers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.providers ADD CONSTRAINT providers_user_id_key UNIQUE (user_id);

CREATE TABLE public.reviews (
    id integer NOT NULL,
    booking_id integer,
    user_id integer,
    provider_id integer,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;
ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);




CREATE TABLE public.service_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    pricing_model character varying(50) NOT NULL,
    CONSTRAINT service_categories_pricing_model_check CHECK (((pricing_model)::text = ANY ((ARRAY['hourly'::character varying, 'per_item'::character varying, 'fixed'::character varying])::text[])))
);

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;
ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);
ALTER TABLE ONLY public.service_categories ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.service_categories ADD CONSTRAINT service_categories_name_key UNIQUE (name);

CREATE TABLE public.services (
    id integer NOT NULL,
    name character varying NOT NULL,
    price numeric,
    description text,
    provider_id integer,
    category_id integer,
    max_workers integer DEFAULT 1,
    base_hours numeric DEFAULT 1
);

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;
ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);
ALTER TABLE ONLY public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id);

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'user'::character varying
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Foreign Keys
ALTER TABLE ONLY public.bookings ADD CONSTRAINT fk_booking_provider FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.bookings ADD CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.bookings ADD CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.providers ADD CONSTRAINT fk_provider_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.services ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id);
ALTER TABLE ONLY public.services ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id);

-- =========================
-- AUTH LOGS TABLE
-- =========================
CREATE TABLE auth_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
