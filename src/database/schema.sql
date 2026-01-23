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

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public;
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    token_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories; Type: TABLE; Schema: public;
--

CREATE TABLE public.categories (
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


--
-- Name: book_catalog; Type: TABLE; Schema: public;
--

CREATE TABLE public.book_catalog (
    id character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    category_code character varying(10) NOT NULL,
    author character varying(100) NOT NULL,
    publisher character varying(100) NOT NULL,
    year integer NOT NULL
);


--
-- Name: book_inventory; Type: TABLE; Schema: public;
--

CREATE TABLE public.book_inventory (
    id character varying(25) NOT NULL,
    catalog_id character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'available' NOT NULL,
    condition character varying(20) DEFAULT 'good' NOT NULL,
    CONSTRAINT book_inventory_status_check CHECK ((status IN ('available', 'loaned', 'lost', 'damaged'))),
    CONSTRAINT book_inventory_condition_check CHECK ((condition IN ('good', 'fair', 'poor')))
);


--
-- Name: loan_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.loan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loans; Type: TABLE; Schema: public;
--

CREATE TABLE public.loans (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    id character varying(20) DEFAULT ('LN'::text || lpad((nextval('public.loan_id_seq'::regclass))::text, 3, '0'::text)),
    inventory_id character varying(25) NOT NULL,
    member_uuid uuid NOT NULL,
    loan_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    return_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: members; Type: TABLE; Schema: public;
--

CREATE TABLE public.members (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    id character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    study_program character varying(100) NOT NULL,
    semester integer NOT NULL,
    CONSTRAINT members_semester_check CHECK (((semester >= 1) AND (semester <= 14)))
);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (code);


--
-- Name: book_catalog book_catalog_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.book_catalog
    ADD CONSTRAINT book_catalog_pkey PRIMARY KEY (id);


--
-- Name: book_inventory book_inventory_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.book_inventory
    ADD CONSTRAINT book_inventory_pkey PRIMARY KEY (id);


--
-- Name: loans loans_id_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_id_key UNIQUE (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (uuid);


--
-- Name: members members_id_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_id_key UNIQUE (id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (uuid);


--
-- Name: idx_book_catalog_category; Type: INDEX; Schema: public;
--

CREATE INDEX idx_book_catalog_category ON public.book_catalog USING btree (category_code);


--
-- Name: idx_book_inventory_catalog; Type: INDEX; Schema: public;
--

CREATE INDEX idx_book_inventory_catalog ON public.book_inventory USING btree (catalog_id);


--
-- Name: idx_book_inventory_status; Type: INDEX; Schema: public;
--

CREATE INDEX idx_book_inventory_status ON public.book_inventory USING btree (status);


--
-- Name: idx_loans_inventory_id; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_inventory_id ON public.loans USING btree (inventory_id);


--
-- Name: idx_loans_id; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_id ON public.loans USING btree (id);


--
-- Name: idx_loans_loan_date; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_loan_date ON public.loans USING btree (loan_date);


--
-- Name: idx_loans_member_uuid; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_member_uuid ON public.loans USING btree (member_uuid);


--
-- Name: book_catalog book_catalog_category_code_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.book_catalog
    ADD CONSTRAINT book_catalog_category_code_fkey FOREIGN KEY (category_code) REFERENCES public.categories(code) ON DELETE RESTRICT;


--
-- Name: book_inventory book_inventory_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.book_inventory
    ADD CONSTRAINT book_inventory_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.book_catalog(id) ON DELETE CASCADE;


--
-- Name: loans loans_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.book_inventory(id) ON DELETE RESTRICT;


--
-- Name: loans loans_member_uuid_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_member_uuid_fkey FOREIGN KEY (member_uuid) REFERENCES public.members(uuid) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--
